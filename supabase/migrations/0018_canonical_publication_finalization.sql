begin;

do $$
begin
  if to_regclass('public.dpp_publication') is null
    or to_regclass('public.dpp_publication_review') is null
  then
    raise exception '0018 requires migrations 0015 and 0016';
  end if;
end;
$$;

create or replace function public.greanlean_store_final_dpp_publication(
  target_product_id uuid,
  target_schema_version text,
  target_profile_key text,
  target_profile_version text,
  target_snapshot jsonb,
  target_canonical_payload text,
  expected_current_publication_id uuid default null,
  publishing_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  product_record public.products%rowtype;
  current_publication_id uuid;
  next_version_number integer;
  snapshot_publication_id uuid;
  snapshot_version_number integer;
  snapshot_published_at timestamptz;
  snapshot_supersedes_id uuid;
  inserted_publication public.dpp_publication%rowtype;
  effective_publisher uuid := coalesce(publishing_user_id, auth.uid());
begin
  select *
  into product_record
  from public.products
  where id = target_product_id
  for update;

  if product_record.id is null then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if nullif(trim(product_record.dpp_id), '') is null then
    raise exception 'PUBLICATION_DPP_ID_REQUIRED' using errcode = '22023';
  end if;
  if target_profile_key is distinct from product_record.dpp_profile_key then
    raise exception 'PUBLICATION_PROFILE_MISMATCH' using errcode = '22023';
  end if;
  if target_snapshot #>> '{publication,productId}' is distinct from target_product_id::text then
    raise exception 'PUBLICATION_PRODUCT_ID_MISMATCH' using errcode = '22023';
  end if;
  if nullif(target_snapshot #>> '{publication,dppId}', '') is distinct from product_record.dpp_id then
    raise exception 'PUBLICATION_DPP_ID_MISMATCH' using errcode = '22023';
  end if;
  if target_snapshot #>> '{publication,status}' is distinct from 'PUBLISHED' then
    raise exception 'PUBLICATION_FINAL_STATUS_REQUIRED' using errcode = '22023';
  end if;
  if target_snapshot #>> '{classification,profileKey}' is distinct from target_profile_key then
    raise exception 'PUBLICATION_CLASSIFICATION_PROFILE_MISMATCH' using errcode = '22023';
  end if;
  if target_snapshot #>> '{classification,profileVersion}' is distinct from target_profile_version then
    raise exception 'PUBLICATION_CLASSIFICATION_VERSION_MISMATCH' using errcode = '22023';
  end if;
  if target_snapshot ->> 'schemaVersion' is distinct from target_schema_version then
    raise exception 'PUBLICATION_SCHEMA_VERSION_MISMATCH' using errcode = '22023';
  end if;

  begin
    snapshot_publication_id := (target_snapshot #>> '{publication,publicationId}')::uuid;
    snapshot_version_number := (target_snapshot #>> '{publication,version}')::integer;
    snapshot_published_at := (target_snapshot #>> '{publication,publishedAt}')::timestamptz;
    snapshot_supersedes_id := nullif(
      target_snapshot #>> '{publication,supersedesPublicationId}',
      ''
    )::uuid;
  exception
    when others then
      raise exception 'PUBLICATION_FINAL_METADATA_INVALID' using errcode = '22023';
  end;

  if snapshot_publication_id is null or snapshot_version_number < 1 or snapshot_published_at is null then
    raise exception 'PUBLICATION_FINAL_METADATA_REQUIRED' using errcode = '22023';
  end if;
  if target_snapshot #>> '{publication,publishedBy}' is distinct from effective_publisher::text then
    raise exception 'PUBLICATION_PUBLISHER_MISMATCH' using errcode = '22023';
  end if;

  select pointer.publication_id
  into current_publication_id
  from public.dpp_product_publication_pointer pointer
  where pointer.product_id = target_product_id
  for update;

  if current_publication_id is distinct from expected_current_publication_id then
    raise exception 'PUBLICATION_VERSION_CONFLICT' using errcode = '40001';
  end if;
  if snapshot_supersedes_id is distinct from current_publication_id then
    raise exception 'PUBLICATION_SUPERSEDES_MISMATCH' using errcode = '40001';
  end if;

  select coalesce(max(publication.version_number), 0) + 1
  into next_version_number
  from public.dpp_publication publication
  where publication.product_id = target_product_id;

  if snapshot_version_number is distinct from next_version_number then
    raise exception 'PUBLICATION_VERSION_NUMBER_MISMATCH' using errcode = '40001';
  end if;

  if current_publication_id is not null then
    update public.dpp_publication
    set status = 'SUPERSEDED'
    where id = current_publication_id;
  end if;

  insert into public.dpp_publication (
    id,
    product_id,
    version_number,
    status,
    schema_version,
    profile_key,
    profile_version,
    snapshot,
    canonical_payload,
    snapshot_hash,
    published_by,
    published_at,
    supersedes_id
  ) values (
    snapshot_publication_id,
    target_product_id,
    next_version_number,
    'PUBLISHED',
    trim(target_schema_version),
    trim(target_profile_key),
    trim(target_profile_version),
    target_snapshot,
    target_canonical_payload,
    repeat('0', 64),
    effective_publisher,
    snapshot_published_at,
    current_publication_id
  )
  returning * into inserted_publication;

  insert into public.dpp_product_publication_pointer (
    product_id,
    publication_id,
    updated_by,
    updated_at
  ) values (
    target_product_id,
    inserted_publication.id,
    effective_publisher,
    now()
  )
  on conflict (product_id) do update set
    publication_id = excluded.publication_id,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

  insert into public.dpp_audit_logs (
    product_id,
    actor_name,
    actor_role,
    action_type,
    target_table,
    target_id,
    previous_hash,
    new_hash,
    notes,
    visibility_level
  ) values (
    target_product_id,
    coalesce(effective_publisher::text, 'service_role'),
    case
      when effective_publisher is null then 'service_role'
      else 'authenticated_server_actor'
    end,
    'DPP_CANONICAL_PUBLICATION_CREATED',
    'dpp_publication',
    inserted_publication.id,
    (
      select previous_publication.snapshot_hash
      from public.dpp_publication previous_publication
      where previous_publication.id = current_publication_id
    ),
    inserted_publication.snapshot_hash,
    format('Published canonical DPP version %s', next_version_number),
    'internal'
  );

  return jsonb_build_object(
    'publicationId', inserted_publication.id,
    'productId', inserted_publication.product_id,
    'versionNumber', inserted_publication.version_number,
    'snapshotHash', inserted_publication.snapshot_hash,
    'status', inserted_publication.status,
    'publishedAt', inserted_publication.published_at
  );
end;
$$;

create or replace function public.greanlean_publish_final_approved_review(
  target_review_id uuid,
  current_source_fingerprint text,
  final_snapshot jsonb,
  final_canonical_payload text,
  publishing_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  review_record public.dpp_publication_review%rowtype;
  publication_result jsonb;
  created_publication_id uuid;
  effective_publisher uuid := coalesce(publishing_user_id, auth.uid());
begin
  select *
  into review_record
  from public.dpp_publication_review
  where id = target_review_id
    and status = 'APPROVED'
  for update;

  if review_record.id is null then
    raise exception 'APPROVED_PUBLICATION_REVIEW_NOT_FOUND' using errcode = 'P0002';
  end if;
  if review_record.source_fingerprint is distinct from current_source_fingerprint then
    raise exception 'PUBLICATION_SOURCE_CHANGED_AFTER_REVIEW' using errcode = '40001';
  end if;
  if review_record.latest_validation_run_id is null then
    raise exception 'PUBLICATION_REVIEW_VALIDATION_REQUIRED' using errcode = '55000';
  end if;
  if exists (
    select 1
    from public.dpp_publication_validation_result validation_result
    where validation_result.validation_run_id = review_record.latest_validation_run_id
      and validation_result.severity = 'BLOCKER'
      and validation_result.passed = false
  ) then
    raise exception 'PUBLICATION_REVIEW_BLOCKERS_REMAIN' using errcode = '55000';
  end if;
  if (final_snapshot - 'publication' - 'integrity')
    is distinct from (review_record.candidate_snapshot - 'publication' - 'integrity')
  then
    raise exception 'PUBLICATION_REVIEWED_CONTENT_CHANGED' using errcode = '40001';
  end if;

  publication_result := public.greanlean_store_final_dpp_publication(
    review_record.product_id,
    review_record.schema_version,
    review_record.profile_key,
    review_record.profile_version,
    final_snapshot,
    final_canonical_payload,
    review_record.base_publication_id,
    effective_publisher
  );

  created_publication_id := (publication_result ->> 'publicationId')::uuid;

  update public.dpp_publication_review
  set
    status = 'PUBLISHED',
    published_publication_id = created_publication_id
  where id = review_record.id;

  insert into public.dpp_audit_logs (
    product_id,
    actor_name,
    actor_role,
    action_type,
    target_table,
    target_id,
    previous_hash,
    new_hash,
    notes,
    visibility_level
  ) values (
    review_record.product_id,
    coalesce(effective_publisher::text, 'service_role'),
    case
      when effective_publisher is null then 'service_role'
      else 'authenticated_server_actor'
    end,
    'DPP_REVIEW_CANONICAL_PUBLICATION_CREATED',
    'dpp_publication_review',
    review_record.id,
    review_record.candidate_hash,
    publication_result ->> 'snapshotHash',
    format('Review published as canonical DPP publication %s', created_publication_id),
    'internal'
  );

  return publication_result || jsonb_build_object('reviewId', review_record.id);
end;
$$;

revoke all on function public.greanlean_store_dpp_publication(
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  uuid,
  uuid
) from public, anon, authenticated, service_role;
revoke all on function public.greanlean_publish_approved_review(
  uuid,
  text,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function public.greanlean_store_final_dpp_publication(
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  uuid,
  uuid
) from public, anon, authenticated;
revoke all on function public.greanlean_publish_final_approved_review(
  uuid,
  text,
  jsonb,
  text,
  uuid
) from public, anon, authenticated;

grant execute on function public.greanlean_store_final_dpp_publication(
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  uuid,
  uuid
) to service_role;
grant execute on function public.greanlean_publish_final_approved_review(
  uuid,
  text,
  jsonb,
  text,
  uuid
) to service_role;

commit;
