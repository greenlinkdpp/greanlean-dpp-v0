begin;

do $$
begin
  if to_regclass('public.dpp_publication') is null
    or to_regclass('public.dpp_product_publication_pointer') is null
  then
    raise exception '0016 requires migration 0015 publication foundation';
  end if;
  if to_regprocedure(
    'public.greanlean_store_dpp_publication(uuid,text,text,text,jsonb,text,uuid,uuid)'
  ) is null then
    raise exception '0016 requires public.greanlean_store_dpp_publication';
  end if;
end;
$$;

create table if not exists public.dpp_publication_review (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  base_publication_id uuid references public.dpp_publication(id) on delete restrict,
  schema_version text not null,
  profile_key text not null,
  profile_version text not null,
  candidate_snapshot jsonb not null,
  canonical_payload text not null,
  candidate_hash text not null,
  source_fingerprint text not null,
  status text not null default 'IN_REVIEW',
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  decision_reason text,
  latest_validation_run_id uuid,
  published_publication_id uuid references public.dpp_publication(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint dpp_publication_review_status_check
    check (
      status in (
        'IN_REVIEW',
        'CHANGES_REQUESTED',
        'APPROVED',
        'REJECTED',
        'CANCELLED',
        'PUBLISHED'
      )
    ),
  constraint dpp_publication_review_schema_version_check
    check (length(trim(schema_version)) between 1 and 40),
  constraint dpp_publication_review_profile_key_check
    check (length(trim(profile_key)) between 1 and 160),
  constraint dpp_publication_review_profile_version_check
    check (length(trim(profile_version)) between 1 and 80),
  constraint dpp_publication_review_snapshot_object_check
    check (jsonb_typeof(candidate_snapshot) = 'object'),
  constraint dpp_publication_review_candidate_hash_check
    check (candidate_hash ~ '^[a-f0-9]{64}$'),
  constraint dpp_publication_review_source_fingerprint_check
    check (source_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint dpp_publication_review_decision_check
    check (
      (
        status = 'IN_REVIEW'
        and reviewed_by is null
        and reviewed_at is null
        and decision_reason is null
      )
      or (
        status in ('CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'PUBLISHED')
        and reviewed_at is not null
      )
    ),
  constraint dpp_publication_review_published_check
    check (
      (status = 'PUBLISHED' and published_publication_id is not null)
      or (status <> 'PUBLISHED' and published_publication_id is null)
    )
);

create unique index if not exists dpp_publication_review_one_open_idx
  on public.dpp_publication_review (product_id)
  where status in ('IN_REVIEW', 'APPROVED');

create index if not exists dpp_publication_review_product_history_idx
  on public.dpp_publication_review (product_id, submitted_at desc);

create table if not exists public.dpp_publication_validation_run (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.dpp_publication_review(id) on delete restrict,
  status text not null default 'COMPLETED',
  rule_set_version text not null,
  passed_count integer not null default 0,
  failed_count integer not null default 0,
  blocker_count integer not null default 0,
  warning_count integer not null default 0,
  executed_by uuid references auth.users(id) on delete set null,
  executed_at timestamptz not null default now(),
  constraint dpp_validation_run_status_check
    check (status in ('COMPLETED', 'FAILED')),
  constraint dpp_validation_run_rule_set_check
    check (length(trim(rule_set_version)) between 1 and 80),
  constraint dpp_validation_run_counts_check
    check (
      passed_count >= 0
      and failed_count >= 0
      and blocker_count >= 0
      and warning_count >= 0
      and blocker_count <= failed_count
    ),
  constraint dpp_validation_run_id_review_key
    unique (id, review_id)
);

create index if not exists dpp_validation_run_review_idx
  on public.dpp_publication_validation_run (review_id, executed_at desc);

create table if not exists public.dpp_publication_validation_result (
  id uuid primary key default gen_random_uuid(),
  validation_run_id uuid not null,
  review_id uuid not null references public.dpp_publication_review(id) on delete restrict,
  rule_code text not null,
  severity text not null,
  module_code text,
  field_code text,
  passed boolean not null,
  message_zh text,
  message_en text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint dpp_validation_result_rule_code_check
    check (length(trim(rule_code)) between 1 and 160),
  constraint dpp_validation_result_severity_check
    check (severity in ('BLOCKER', 'WARNING', 'INFO')),
  constraint dpp_validation_result_details_check
    check (jsonb_typeof(details) = 'object'),
  constraint dpp_validation_result_run_review_fk
    foreign key (validation_run_id, review_id)
    references public.dpp_publication_validation_run(id, review_id)
    on delete restrict
);

create index if not exists dpp_validation_result_review_idx
  on public.dpp_publication_validation_result (review_id, created_at desc);

create index if not exists dpp_validation_result_failed_idx
  on public.dpp_publication_validation_result (validation_run_id, severity)
  where passed = false;

alter table public.dpp_publication_review
  drop constraint if exists dpp_publication_review_latest_validation_fk;
alter table public.dpp_publication_review
  add constraint dpp_publication_review_latest_validation_fk
  foreign key (latest_validation_run_id, id)
  references public.dpp_publication_validation_run(id, review_id)
  on delete restrict;

comment on table public.dpp_publication_review is
  'Immutable review candidate for a complete DPP publication. Editing source data requires a new candidate.';
comment on table public.dpp_publication_validation_run is
  'Append-only validation execution summary for a review candidate.';
comment on table public.dpp_publication_validation_result is
  'Append-only structured validation evidence. Failed BLOCKER results prevent approval and publication.';

create or replace function public.greanlean_prepare_publication_review()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parsed_canonical_payload jsonb;
  computed_hash text;
  current_publication_id uuid;
begin
  if not public.greanlean_publication_snapshot_is_well_formed(new.candidate_snapshot) then
    raise exception 'REVIEW_CANDIDATE_SNAPSHOT_MALFORMED' using errcode = '22023';
  end if;

  begin
    parsed_canonical_payload := new.canonical_payload::jsonb;
  exception
    when others then
      raise exception 'REVIEW_CANONICAL_PAYLOAD_INVALID_JSON' using errcode = '22023';
  end;

  if parsed_canonical_payload is distinct from (new.candidate_snapshot - 'integrity') then
    raise exception 'REVIEW_CANONICAL_PAYLOAD_MISMATCH' using errcode = '22023';
  end if;

  select pointer.publication_id
  into current_publication_id
  from public.dpp_product_publication_pointer pointer
  where pointer.product_id = new.product_id;

  if current_publication_id is distinct from new.base_publication_id then
    raise exception 'REVIEW_BASE_PUBLICATION_CONFLICT' using errcode = '40001';
  end if;

  computed_hash := encode(extensions.digest(convert_to(new.canonical_payload, 'UTF8'), 'sha256'), 'hex');
  new.candidate_hash := computed_hash;
  new.candidate_snapshot := jsonb_set(
    new.candidate_snapshot,
    '{integrity}',
    jsonb_build_object(
      'algorithm', 'SHA-256',
      'canonicalization', 'JCS',
      'digest', computed_hash,
      'generatedAt', new.submitted_at,
      'anchorStatus', 'NOT_CONFIGURED'
    ),
    true
  );

  return new;
end;
$$;

create or replace function public.greanlean_guard_publication_review()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'DPP_PUBLICATION_REVIEW_DELETE_FORBIDDEN' using errcode = '55000';
  end if;

  if new.id is distinct from old.id
    or new.product_id is distinct from old.product_id
    or new.base_publication_id is distinct from old.base_publication_id
    or new.schema_version is distinct from old.schema_version
    or new.profile_key is distinct from old.profile_key
    or new.profile_version is distinct from old.profile_version
    or new.candidate_snapshot is distinct from old.candidate_snapshot
    or new.canonical_payload is distinct from old.canonical_payload
    or new.candidate_hash is distinct from old.candidate_hash
    or new.source_fingerprint is distinct from old.source_fingerprint
    or new.submitted_by is distinct from old.submitted_by
    or new.submitted_at is distinct from old.submitted_at
    or new.created_at is distinct from old.created_at
  then
    raise exception 'DPP_PUBLICATION_REVIEW_CANDIDATE_IMMUTABLE' using errcode = '55000';
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'IN_REVIEW' and new.status in ('CHANGES_REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED'))
      or (old.status = 'APPROVED' and new.status in ('PUBLISHED', 'CANCELLED'))
    ) then
      raise exception 'DPP_PUBLICATION_REVIEW_TRANSITION_FORBIDDEN' using errcode = '55000';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.greanlean_prevent_publication_validation_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'DPP_PUBLICATION_VALIDATION_APPEND_ONLY' using errcode = '55000';
end;
$$;

drop trigger if exists dpp_publication_review_prepare on public.dpp_publication_review;
create trigger dpp_publication_review_prepare
  before insert on public.dpp_publication_review
  for each row execute function public.greanlean_prepare_publication_review();

drop trigger if exists dpp_publication_review_guard on public.dpp_publication_review;
create trigger dpp_publication_review_guard
  before update or delete on public.dpp_publication_review
  for each row execute function public.greanlean_guard_publication_review();

drop trigger if exists dpp_validation_run_append_only on public.dpp_publication_validation_run;
create trigger dpp_validation_run_append_only
  before update or delete on public.dpp_publication_validation_run
  for each row execute function public.greanlean_prevent_publication_validation_mutation();

drop trigger if exists dpp_validation_result_append_only on public.dpp_publication_validation_result;
create trigger dpp_validation_result_append_only
  before update or delete on public.dpp_publication_validation_result
  for each row execute function public.greanlean_prevent_publication_validation_mutation();

alter table public.dpp_publication_review enable row level security;
alter table public.dpp_publication_validation_run enable row level security;
alter table public.dpp_publication_validation_result enable row level security;

drop policy if exists "Platform administrators read publication reviews"
  on public.dpp_publication_review;
create policy "Platform administrators read publication reviews"
  on public.dpp_publication_review for select to authenticated
  using (public.greanlean_is_platform_admin(auth.uid()));

drop policy if exists "Platform administrators read publication validation runs"
  on public.dpp_publication_validation_run;
create policy "Platform administrators read publication validation runs"
  on public.dpp_publication_validation_run for select to authenticated
  using (public.greanlean_is_platform_admin(auth.uid()));

drop policy if exists "Platform administrators read publication validation results"
  on public.dpp_publication_validation_result;
create policy "Platform administrators read publication validation results"
  on public.dpp_publication_validation_result for select to authenticated
  using (public.greanlean_is_platform_admin(auth.uid()));

revoke all on public.dpp_publication_review from public, anon, authenticated;
revoke all on public.dpp_publication_validation_run from public, anon, authenticated;
revoke all on public.dpp_publication_validation_result from public, anon, authenticated;
grant select on public.dpp_publication_review to authenticated;
grant select on public.dpp_publication_validation_run to authenticated;
grant select on public.dpp_publication_validation_result to authenticated;
grant select, insert, update, delete on public.dpp_publication_review to service_role;
grant select, insert, update, delete on public.dpp_publication_validation_run to service_role;
grant select, insert, update, delete on public.dpp_publication_validation_result to service_role;

create or replace function public.greanlean_create_publication_review(
  target_product_id uuid,
  target_schema_version text,
  target_profile_key text,
  target_profile_version text,
  target_candidate_snapshot jsonb,
  target_canonical_payload text,
  target_source_fingerprint text,
  submitting_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  product_record public.products%rowtype;
  current_publication_id uuid;
  inserted_review public.dpp_publication_review%rowtype;
  effective_submitter uuid := coalesce(submitting_user_id, auth.uid());
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
    raise exception 'REVIEW_DPP_ID_REQUIRED' using errcode = '22023';
  end if;

  if target_profile_key is distinct from product_record.dpp_profile_key then
    raise exception 'REVIEW_PROFILE_MISMATCH' using errcode = '22023';
  end if;

  if target_candidate_snapshot #>> '{publication,productId}' is distinct from target_product_id::text then
    raise exception 'REVIEW_PRODUCT_ID_MISMATCH' using errcode = '22023';
  end if;

  if nullif(target_candidate_snapshot #>> '{publication,dppId}', '') is distinct from product_record.dpp_id then
    raise exception 'REVIEW_DPP_ID_MISMATCH' using errcode = '22023';
  end if;

  if target_candidate_snapshot #>> '{classification,profileKey}' is distinct from target_profile_key then
    raise exception 'REVIEW_CLASSIFICATION_PROFILE_MISMATCH' using errcode = '22023';
  end if;

  if target_source_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'REVIEW_SOURCE_FINGERPRINT_INVALID' using errcode = '22023';
  end if;

  select pointer.publication_id
  into current_publication_id
  from public.dpp_product_publication_pointer pointer
  where pointer.product_id = target_product_id;

  insert into public.dpp_publication_review (
    product_id,
    base_publication_id,
    schema_version,
    profile_key,
    profile_version,
    candidate_snapshot,
    canonical_payload,
    candidate_hash,
    source_fingerprint,
    status,
    submitted_by,
    submitted_at
  ) values (
    target_product_id,
    current_publication_id,
    trim(target_schema_version),
    trim(target_profile_key),
    trim(target_profile_version),
    target_candidate_snapshot,
    target_canonical_payload,
    repeat('0', 64),
    target_source_fingerprint,
    'IN_REVIEW',
    effective_submitter,
    now()
  )
  returning * into inserted_review;

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
    coalesce(effective_submitter::text, 'service_role'),
    case
      when effective_submitter is null then 'service_role'
      else 'authenticated_server_actor'
    end,
    'DPP_REVIEW_SUBMITTED',
    'dpp_publication_review',
    inserted_review.id,
    (
      select publication.snapshot_hash
      from public.dpp_publication publication
      where publication.id = current_publication_id
    ),
    inserted_review.candidate_hash,
    'Complete DPP candidate submitted for review',
    'internal'
  );

  return jsonb_build_object(
    'reviewId', inserted_review.id,
    'productId', inserted_review.product_id,
    'basePublicationId', inserted_review.base_publication_id,
    'candidateHash', inserted_review.candidate_hash,
    'status', inserted_review.status,
    'submittedAt', inserted_review.submitted_at
  );
end;
$$;

create or replace function public.greanlean_record_publication_validation(
  target_review_id uuid,
  target_rule_set_version text,
  validation_results jsonb,
  executing_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  review_record public.dpp_publication_review%rowtype;
  validation_run_id uuid := gen_random_uuid();
  result_row jsonb;
  result_passed boolean;
  result_severity text;
  passed_total integer := 0;
  failed_total integer := 0;
  blocker_total integer := 0;
  warning_total integer := 0;
  effective_executor uuid := coalesce(executing_user_id, auth.uid());
begin
  if jsonb_typeof(validation_results) <> 'array'
    or jsonb_array_length(validation_results) = 0
  then
    raise exception 'VALIDATION_RESULTS_REQUIRED' using errcode = '22023';
  end if;

  select *
  into review_record
  from public.dpp_publication_review
  where id = target_review_id
  for update;

  if review_record.id is null then
    raise exception 'PUBLICATION_REVIEW_NOT_FOUND' using errcode = 'P0002';
  end if;

  if review_record.status <> 'IN_REVIEW' then
    raise exception 'PUBLICATION_REVIEW_NOT_OPEN' using errcode = '55000';
  end if;

  for result_row in
    select value from jsonb_array_elements(validation_results)
  loop
    if jsonb_typeof(result_row) <> 'object'
      or length(trim(coalesce(result_row ->> 'ruleCode', ''))) = 0
      or jsonb_typeof(result_row -> 'passed') <> 'boolean'
    then
      raise exception 'VALIDATION_RESULT_MALFORMED' using errcode = '22023';
    end if;

    result_severity := upper(coalesce(result_row ->> 'severity', 'INFO'));
    if result_severity not in ('BLOCKER', 'WARNING', 'INFO') then
      raise exception 'VALIDATION_SEVERITY_INVALID' using errcode = '22023';
    end if;

    result_passed := (result_row ->> 'passed')::boolean;
    if result_passed then
      passed_total := passed_total + 1;
    else
      failed_total := failed_total + 1;
      if result_severity = 'BLOCKER' then
        blocker_total := blocker_total + 1;
      elsif result_severity = 'WARNING' then
        warning_total := warning_total + 1;
      end if;
    end if;
  end loop;

  insert into public.dpp_publication_validation_run (
    id,
    review_id,
    status,
    rule_set_version,
    passed_count,
    failed_count,
    blocker_count,
    warning_count,
    executed_by,
    executed_at
  ) values (
    validation_run_id,
    target_review_id,
    'COMPLETED',
    trim(target_rule_set_version),
    passed_total,
    failed_total,
    blocker_total,
    warning_total,
    effective_executor,
    now()
  );

  for result_row in
    select value from jsonb_array_elements(validation_results)
  loop
    insert into public.dpp_publication_validation_result (
      validation_run_id,
      review_id,
      rule_code,
      severity,
      module_code,
      field_code,
      passed,
      message_zh,
      message_en,
      details
    ) values (
      validation_run_id,
      target_review_id,
      trim(result_row ->> 'ruleCode'),
      upper(coalesce(result_row ->> 'severity', 'INFO')),
      nullif(trim(result_row ->> 'moduleCode'), ''),
      nullif(trim(result_row ->> 'fieldCode'), ''),
      (result_row ->> 'passed')::boolean,
      nullif(result_row ->> 'messageZh', ''),
      nullif(result_row ->> 'messageEn', ''),
      case
        when jsonb_typeof(result_row -> 'details') = 'object'
          then result_row -> 'details'
        else '{}'::jsonb
      end
    );
  end loop;

  update public.dpp_publication_review
  set latest_validation_run_id = validation_run_id
  where id = target_review_id;

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
    coalesce(effective_executor::text, 'service_role'),
    case
      when effective_executor is null then 'service_role'
      else 'authenticated_server_actor'
    end,
    'DPP_REVIEW_VALIDATED',
    'dpp_publication_validation_run',
    validation_run_id,
    review_record.candidate_hash,
    review_record.candidate_hash,
    format(
      'Validation completed: %s passed, %s failed, %s blockers',
      passed_total,
      failed_total,
      blocker_total
    ),
    'internal'
  );

  return jsonb_build_object(
    'validationRunId', validation_run_id,
    'reviewId', target_review_id,
    'passed', passed_total,
    'failed', failed_total,
    'blockers', blocker_total,
    'warnings', warning_total
  );
end;
$$;

create or replace function public.greanlean_decide_publication_review(
  target_review_id uuid,
  decision_value text,
  decision_reason_value text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  review_record public.dpp_publication_review%rowtype;
  normalized_decision text := upper(trim(coalesce(decision_value, '')));
  target_status text;
  blocker_total integer;
begin
  if not public.greanlean_is_platform_admin(auth.uid()) then
    raise exception 'PLATFORM_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if normalized_decision not in ('APPROVED', 'CHANGES_REQUESTED', 'REJECTED') then
    raise exception 'PUBLICATION_REVIEW_DECISION_INVALID' using errcode = '22023';
  end if;

  if normalized_decision <> 'APPROVED'
    and length(trim(coalesce(decision_reason_value, ''))) < 5
  then
    raise exception 'PUBLICATION_REVIEW_DECISION_REASON_REQUIRED' using errcode = '22023';
  end if;

  select *
  into review_record
  from public.dpp_publication_review
  where id = target_review_id
    and status = 'IN_REVIEW'
  for update;

  if review_record.id is null then
    raise exception 'OPEN_PUBLICATION_REVIEW_NOT_FOUND' using errcode = 'P0002';
  end if;

  if review_record.latest_validation_run_id is null then
    raise exception 'PUBLICATION_REVIEW_VALIDATION_REQUIRED' using errcode = '55000';
  end if;

  select validation_run.blocker_count
  into blocker_total
  from public.dpp_publication_validation_run validation_run
  where validation_run.id = review_record.latest_validation_run_id
    and validation_run.status = 'COMPLETED';

  if blocker_total is null then
    raise exception 'PUBLICATION_REVIEW_VALIDATION_INCOMPLETE' using errcode = '55000';
  end if;

  if normalized_decision = 'APPROVED' and blocker_total > 0 then
    raise exception 'PUBLICATION_REVIEW_BLOCKERS_REMAIN' using errcode = '55000';
  end if;

  target_status := normalized_decision;

  update public.dpp_publication_review
  set
    status = target_status,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    decision_reason = nullif(trim(decision_reason_value), '')
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
    auth.uid()::text,
    'platform_admin',
    'DPP_REVIEW_' || target_status,
    'dpp_publication_review',
    review_record.id,
    review_record.candidate_hash,
    review_record.candidate_hash,
    coalesce(nullif(trim(decision_reason_value), ''), 'Review approved'),
    'internal'
  );

  return jsonb_build_object(
    'reviewId', review_record.id,
    'productId', review_record.product_id,
    'status', target_status,
    'reviewedAt', now()
  );
end;
$$;

create or replace function public.greanlean_publish_approved_review(
  target_review_id uuid,
  current_source_fingerprint text,
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

  if exists (
    select 1
    from public.dpp_publication_validation_result validation_result
    where validation_result.validation_run_id = review_record.latest_validation_run_id
      and validation_result.severity = 'BLOCKER'
      and validation_result.passed = false
  ) then
    raise exception 'PUBLICATION_REVIEW_BLOCKERS_REMAIN' using errcode = '55000';
  end if;

  publication_result := public.greanlean_store_dpp_publication(
    review_record.product_id,
    review_record.schema_version,
    review_record.profile_key,
    review_record.profile_version,
    review_record.candidate_snapshot,
    review_record.canonical_payload,
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
    'DPP_REVIEW_PUBLISHED',
    'dpp_publication_review',
    review_record.id,
    review_record.candidate_hash,
    review_record.candidate_hash,
    format('Review published as DPP publication %s', created_publication_id),
    'internal'
  );

  return publication_result || jsonb_build_object('reviewId', review_record.id);
end;
$$;

revoke all on function public.greanlean_create_publication_review(
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  text,
  uuid
) from public, anon, authenticated;
revoke all on function public.greanlean_record_publication_validation(
  uuid,
  text,
  jsonb,
  uuid
) from public, anon, authenticated;
revoke all on function public.greanlean_decide_publication_review(
  uuid,
  text,
  text
) from public;
revoke all on function public.greanlean_publish_approved_review(
  uuid,
  text,
  uuid
) from public, anon, authenticated;

grant execute on function public.greanlean_create_publication_review(
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  text,
  uuid
) to service_role;
grant execute on function public.greanlean_record_publication_validation(
  uuid,
  text,
  jsonb,
  uuid
) to service_role;
grant execute on function public.greanlean_decide_publication_review(
  uuid,
  text,
  text
) to authenticated;
grant execute on function public.greanlean_publish_approved_review(
  uuid,
  text,
  uuid
) to service_role;

commit;
