begin;

do $$
begin
  if to_regclass('public.products') is null
    or to_regclass('public.dpp_audit_logs') is null
    or to_regclass('public.dpp_publication') is null
  then
    raise exception '0020 requires the product, audit, and publication foundations';
  end if;
  if to_regprocedure('public.greanlean_is_platform_admin(uuid)') is null then
    raise exception '0020 requires migration 0013 identity and access';
  end if;
end;
$$;

create table if not exists public.dpp_blockchain_anchors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  version text,
  anchored_hash text not null,
  hash_algorithm text default 'SHA-256',
  chain_name text,
  chain_id text,
  network text default 'testnet',
  contract_address text,
  transaction_hash text,
  block_number text,
  anchor_status text default 'pending',
  anchored_at timestamptz,
  explorer_url text,
  notes text,
  visibility_level text default 'public',
  created_at timestamptz default now()
);

comment on table public.dpp_blockchain_anchors is
  'Compatibility projection of verified blockchain receipts used by DPP readers and exports.';

create table if not exists public.dpp_blockchain_connector (
  id uuid primary key default gen_random_uuid(),
  connector_code text not null unique,
  chain_name text not null,
  chain_id text not null,
  network text not null,
  contract_address text,
  configuration_reference text not null,
  status text not null default 'DISABLED',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dpp_blockchain_connector_code_check
    check (connector_code ~ '^[a-z0-9][a-z0-9._-]{1,79}$'),
  constraint dpp_blockchain_connector_status_check
    check (status in ('DISABLED', 'VERIFYING', 'ACTIVE', 'REVOKED')),
  constraint dpp_blockchain_connector_active_check
    check (status <> 'ACTIVE' or verified_at is not null)
);

create table if not exists public.dpp_blockchain_anchor_request (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  publication_id uuid not null references public.dpp_publication(id) on delete restrict,
  connector_id uuid references public.dpp_blockchain_connector(id) on delete restrict,
  anchored_hash text not null,
  hash_algorithm text not null default 'SHA-256',
  request_status text not null,
  requested_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  constraint dpp_blockchain_anchor_request_hash_check
    check (anchored_hash ~ '^[a-f0-9]{64}$'),
  constraint dpp_blockchain_anchor_request_algorithm_check
    check (hash_algorithm = 'SHA-256'),
  constraint dpp_blockchain_anchor_request_status_check
    check (request_status in ('QUEUED', 'BLOCKED_UNCONFIGURED')),
  constraint dpp_blockchain_anchor_request_connector_check
    check (
      (request_status = 'QUEUED' and connector_id is not null)
      or
      (request_status = 'BLOCKED_UNCONFIGURED' and connector_id is null)
    ),
  unique (publication_id, connector_id)
);

create table if not exists public.dpp_blockchain_anchor_receipt (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique
    references public.dpp_blockchain_anchor_request(id) on delete restrict,
  connector_id uuid not null
    references public.dpp_blockchain_connector(id) on delete restrict,
  transaction_hash text not null,
  block_number text,
  explorer_url text,
  receipt_payload jsonb not null default '{}'::jsonb,
  confirmed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  constraint dpp_blockchain_anchor_receipt_hash_check
    check (length(trim(transaction_hash)) between 10 and 256),
  constraint dpp_blockchain_anchor_receipt_payload_check
    check (jsonb_typeof(receipt_payload) = 'object')
);

comment on table public.dpp_blockchain_connector is
  'Metadata for a verified server-side blockchain connector. Secrets remain in the external secret manager referenced by configuration_reference.';
comment on table public.dpp_blockchain_anchor_request is
  'Immutable blockchain anchor requests. An unconfigured connector produces a blocked request without a transaction hash.';
comment on table public.dpp_blockchain_anchor_receipt is
  'Append-only receipt returned by a verified blockchain connector. Transaction hashes are never generated locally.';

create or replace function public.greanlean_prevent_system_record_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'System-generated DPP records are append-only';
end;
$$;

drop trigger if exists dpp_blockchain_request_append_only
  on public.dpp_blockchain_anchor_request;
create trigger dpp_blockchain_request_append_only
  before update or delete on public.dpp_blockchain_anchor_request
  for each row execute function public.greanlean_prevent_system_record_mutation();

drop trigger if exists dpp_blockchain_receipt_append_only
  on public.dpp_blockchain_anchor_receipt;
create trigger dpp_blockchain_receipt_append_only
  before update or delete on public.dpp_blockchain_anchor_receipt
  for each row execute function public.greanlean_prevent_system_record_mutation();

drop trigger if exists dpp_legacy_audit_append_only on public.dpp_audit_logs;
create trigger dpp_legacy_audit_append_only
  before update or delete on public.dpp_audit_logs
  for each row execute function public.greanlean_prevent_system_record_mutation();

drop trigger if exists dpp_legacy_blockchain_anchor_append_only
  on public.dpp_blockchain_anchors;
create trigger dpp_legacy_blockchain_anchor_append_only
  before update or delete on public.dpp_blockchain_anchors
  for each row execute function public.greanlean_prevent_system_record_mutation();

drop trigger if exists dpp_legacy_registration_proof_append_only
  on public.dpp_registration_proofs;
create trigger dpp_legacy_registration_proof_append_only
  before update or delete on public.dpp_registration_proofs
  for each row execute function public.greanlean_prevent_system_record_mutation();

create or replace function public.greanlean_guard_registry_environment_result()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  enrolment_verified boolean := false;
begin
  if new.environment = 'TEST'
    and (
      new.submission_status = 'ACCEPTED'
      or new.persistent_registration_id is not null
    )
  then
    raise exception 'REGISTRY_TEST_CANNOT_RECORD_PRODUCTION_SUCCESS'
      using errcode = '22023';
  end if;

  if new.environment = 'PRODUCTION'
    and new.submission_status = 'ACCEPTED'
  then
    select
      enrolment.environment = 'PRODUCTION'
      and enrolment.verification_status = 'VERIFIED'
    into enrolment_verified
    from public.registry_organisation_enrolment enrolment
    where enrolment.id = new.enrolment_id;

    if not coalesce(enrolment_verified, false)
      or new.registry_schema_version is null
      or new.response_payload is null
      or new.persistent_registration_id is null
    then
      raise exception 'REGISTRY_PRODUCTION_ACCEPTANCE_EVIDENCE_REQUIRED'
        using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists registry_submission_environment_result_guard
  on public.registry_submission;
create trigger registry_submission_environment_result_guard
  before insert or update on public.registry_submission
  for each row execute function public.greanlean_guard_registry_environment_result();

create or replace function public.greanlean_request_blockchain_anchor(
  target_product_id uuid,
  target_publication_id uuid,
  requesting_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  publication_record public.dpp_publication%rowtype;
  connector_record public.dpp_blockchain_connector%rowtype;
  request_record public.dpp_blockchain_anchor_request%rowtype;
  effective_actor uuid := coalesce(requesting_user_id, auth.uid());
begin
  select publication.*
  into publication_record
  from public.dpp_publication publication
  where publication.id = target_publication_id
    and publication.product_id = target_product_id
    and publication.status in ('PUBLISHED', 'SUPERSEDED');

  if publication_record.id is null then
    raise exception 'BLOCKCHAIN_PUBLICATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  select connector.*
  into connector_record
  from public.dpp_blockchain_connector connector
  where connector.status = 'ACTIVE'
    and connector.verified_at is not null
  order by connector.verified_at desc
  limit 1;

  insert into public.dpp_blockchain_anchor_request (
    product_id,
    publication_id,
    connector_id,
    anchored_hash,
    request_status,
    requested_by
  ) values (
    target_product_id,
    target_publication_id,
    connector_record.id,
    publication_record.snapshot_hash,
    case
      when connector_record.id is null then 'BLOCKED_UNCONFIGURED'
      else 'QUEUED'
    end,
    effective_actor
  )
  returning * into request_record;

  insert into public.dpp_audit_logs (
    product_id,
    actor_name,
    actor_role,
    action_type,
    target_table,
    target_id,
    new_hash,
    notes,
    visibility_level
  ) values (
    target_product_id,
    coalesce(effective_actor::text, 'service_role'),
    case when effective_actor is null then 'service_role' else 'authenticated_server_actor' end,
    case
      when connector_record.id is null then 'BLOCKCHAIN_ANCHOR_BLOCKED_UNCONFIGURED'
      else 'BLOCKCHAIN_ANCHOR_QUEUED'
    end,
    'dpp_blockchain_anchor_request',
    request_record.id,
    publication_record.snapshot_hash,
    case
      when connector_record.id is null then 'No verified blockchain connector is configured; no transaction hash was created.'
      else format('Queued for verified connector %s', connector_record.connector_code)
    end,
    'internal'
  );

  return jsonb_build_object(
    'requestId', request_record.id,
    'status', request_record.request_status,
    'connectorConfigured', connector_record.id is not null,
    'transactionHash', null
  );
end;
$$;

create or replace function public.greanlean_record_blockchain_receipt(
  target_request_id uuid,
  returned_transaction_hash text,
  returned_block_number text,
  returned_explorer_url text,
  returned_receipt_payload jsonb,
  returned_confirmed_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_record public.dpp_blockchain_anchor_request%rowtype;
  connector_record public.dpp_blockchain_connector%rowtype;
  publication_record public.dpp_publication%rowtype;
  receipt_record public.dpp_blockchain_anchor_receipt%rowtype;
  legacy_anchor_id uuid;
begin
  select request.*
  into request_record
  from public.dpp_blockchain_anchor_request request
  where request.id = target_request_id;

  if request_record.id is null or request_record.request_status <> 'QUEUED' then
    raise exception 'BLOCKCHAIN_ANCHOR_REQUEST_NOT_QUEUED' using errcode = '22023';
  end if;

  select connector.*
  into connector_record
  from public.dpp_blockchain_connector connector
  where connector.id = request_record.connector_id
    and connector.status = 'ACTIVE'
    and connector.verified_at is not null;

  if connector_record.id is null then
    raise exception 'BLOCKCHAIN_CONNECTOR_NOT_ACTIVE' using errcode = '22023';
  end if;
  if length(trim(coalesce(returned_transaction_hash, ''))) < 10 then
    raise exception 'BLOCKCHAIN_CONNECTOR_RECEIPT_REQUIRED' using errcode = '22023';
  end if;

  select publication.*
  into publication_record
  from public.dpp_publication publication
  where publication.id = request_record.publication_id;

  insert into public.dpp_blockchain_anchor_receipt (
    request_id,
    connector_id,
    transaction_hash,
    block_number,
    explorer_url,
    receipt_payload,
    confirmed_at
  ) values (
    request_record.id,
    connector_record.id,
    trim(returned_transaction_hash),
    nullif(trim(coalesce(returned_block_number, '')), ''),
    nullif(trim(coalesce(returned_explorer_url, '')), ''),
    coalesce(returned_receipt_payload, '{}'::jsonb),
    coalesce(returned_confirmed_at, now())
  )
  returning * into receipt_record;

  insert into public.dpp_blockchain_anchors (
    product_id,
    version,
    anchored_hash,
    hash_algorithm,
    chain_name,
    chain_id,
    network,
    contract_address,
    transaction_hash,
    block_number,
    anchor_status,
    anchored_at,
    explorer_url,
    notes,
    visibility_level
  ) values (
    request_record.product_id,
    format('v%s', publication_record.version_number),
    request_record.anchored_hash,
    'SHA-256',
    connector_record.chain_name,
    connector_record.chain_id,
    connector_record.network,
    connector_record.contract_address,
    receipt_record.transaction_hash,
    receipt_record.block_number,
    'confirmed',
    receipt_record.confirmed_at,
    receipt_record.explorer_url,
    format('Verified connector receipt %s', receipt_record.id),
    'authority'
  )
  returning id into legacy_anchor_id;

  insert into public.dpp_audit_logs (
    product_id,
    actor_name,
    actor_role,
    action_type,
    target_table,
    target_id,
    new_hash,
    notes,
    visibility_level
  ) values (
    request_record.product_id,
    'blockchain_connector:' || connector_record.connector_code,
    'trusted_integration',
    'BLOCKCHAIN_ANCHOR_CONFIRMED',
    'dpp_blockchain_anchors',
    legacy_anchor_id,
    request_record.anchored_hash,
    format('Receipt %s recorded with transaction hash supplied by the connector.', receipt_record.id),
    'internal'
  );

  return jsonb_build_object(
    'requestId', request_record.id,
    'receiptId', receipt_record.id,
    'anchorId', legacy_anchor_id,
    'status', 'CONFIRMED',
    'transactionHash', receipt_record.transaction_hash
  );
end;
$$;

alter table public.dpp_blockchain_connector enable row level security;
alter table public.dpp_blockchain_anchor_request enable row level security;
alter table public.dpp_blockchain_anchor_receipt enable row level security;
alter table public.dpp_blockchain_anchors enable row level security;

drop policy if exists "Platform administrators read blockchain connectors"
  on public.dpp_blockchain_connector;
create policy "Platform administrators read blockchain connectors"
  on public.dpp_blockchain_connector for select to authenticated
  using (public.greanlean_is_platform_admin(auth.uid()));

drop policy if exists "Platform administrators read blockchain requests"
  on public.dpp_blockchain_anchor_request;
create policy "Platform administrators read blockchain requests"
  on public.dpp_blockchain_anchor_request for select to authenticated
  using (public.greanlean_is_platform_admin(auth.uid()));

drop policy if exists "Platform administrators read blockchain receipts"
  on public.dpp_blockchain_anchor_receipt;
create policy "Platform administrators read blockchain receipts"
  on public.dpp_blockchain_anchor_receipt for select to authenticated
  using (public.greanlean_is_platform_admin(auth.uid()));

do $$
declare
  target_table text;
  target_policy text;
  managed_tables text[] := array[
    'products',
    'product_sector_field_values',
    'product_versions',
    'product_suppliers',
    'supplier_products',
    'product_materials',
    'product_bom',
    'product_esg_metrics',
    'product_certificates',
    'product_traceability',
    'product_circularity',
    'product_consumer_transparency',
    'product_digital_identity',
    'product_documents',
    'product_data_governance',
    'dpp_registry_submissions',
    'dpp_registration_proofs',
    'dpp_evidence_links',
    'dpp_audit_logs',
    'dpp_blockchain_anchors',
    'battery_source_device',
    'battery_integration_credential',
    'battery_ingestion_request',
    'registry_submission',
    'registry_validation_result',
    'registry_error_log',
    'registry_registration_proof'
  ];
begin
  foreach target_table in array managed_tables loop
    if to_regclass(format('public.%I', target_table)) is null then
      continue;
    end if;

    for target_policy in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
        and cmd <> 'SELECT'
        and (
          'anon' = any(roles)
          or 'authenticated' = any(roles)
        )
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        target_policy,
        target_table
      );
    end loop;

    execute format(
      'revoke insert, update, delete, truncate on public.%I from anon, authenticated',
      target_table
    );
  end loop;
end;
$$;

do $$
declare
  target_table text;
  business_tables text[] := array[
    'products',
    'product_sector_field_values',
    'product_versions',
    'product_suppliers',
    'supplier_products',
    'product_materials',
    'product_bom',
    'product_esg_metrics',
    'product_certificates',
    'product_traceability',
    'product_circularity',
    'product_consumer_transparency',
    'product_digital_identity',
    'product_documents',
    'product_data_governance',
    'dpp_registry_submissions',
    'dpp_registration_proofs',
    'dpp_evidence_links',
    'dpp_audit_logs',
    'dpp_blockchain_anchors',
    'battery_source_device',
    'battery_integration_credential',
    'battery_ingestion_request'
  ];
begin
  foreach target_table in array business_tables loop
    if to_regclass(format('public.%I', target_table)) is null then
      continue;
    end if;
    execute format('grant select on public.%I to authenticated', target_table);
    execute format(
      'drop policy if exists %I on public.%I',
      'Platform administrators read ' || target_table,
      target_table
    );
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.greanlean_is_platform_admin(auth.uid()))',
      'Platform administrators read ' || target_table,
      target_table
    );
  end loop;
end;
$$;

grant select, insert, update, delete on public.products to service_role;
grant select, insert, update, delete on public.product_sector_field_values to service_role;
grant select on public.product_versions to service_role;
grant select, insert, update, delete on public.product_suppliers to service_role;
grant select, insert, update, delete on public.supplier_products to service_role;
grant select, insert, update, delete on public.product_materials to service_role;
grant select, insert, update, delete on public.product_bom to service_role;
grant select, insert, update, delete on public.product_esg_metrics to service_role;
grant select, insert, update, delete on public.product_certificates to service_role;
grant select, insert, update, delete on public.product_traceability to service_role;
grant select, insert, update, delete on public.product_circularity to service_role;
grant select, insert, update, delete on public.product_consumer_transparency to service_role;
grant select, insert, update, delete on public.product_digital_identity to service_role;
grant select, insert, update, delete on public.product_documents to service_role;
grant select, insert, update, delete on public.product_data_governance to service_role;
grant select, insert, update, delete on public.dpp_evidence_links to service_role;

revoke update, delete, truncate on public.product_versions from service_role;
revoke update, delete, truncate on public.dpp_registry_submissions from service_role;
revoke update, delete, truncate on public.dpp_registration_proofs from service_role;
revoke update, delete, truncate on public.dpp_audit_logs from service_role;
revoke update, delete, truncate on public.dpp_blockchain_anchors from service_role;
grant select, insert on public.dpp_audit_logs to service_role;
grant select, insert on public.dpp_blockchain_anchors to service_role;
grant select on public.dpp_registry_submissions to service_role;
grant select on public.dpp_registration_proofs to service_role;

revoke delete, truncate on public.dpp_blockchain_connector from service_role;
revoke update, delete, truncate on public.dpp_blockchain_anchor_request from service_role;
revoke update, delete, truncate on public.dpp_blockchain_anchor_receipt from service_role;
grant select, insert, update on public.dpp_blockchain_connector to service_role;
grant select, insert on public.dpp_blockchain_anchor_request to service_role;
grant select, insert on public.dpp_blockchain_anchor_receipt to service_role;

revoke all on function public.greanlean_request_blockchain_anchor(
  uuid,
  uuid,
  uuid
) from public, anon, authenticated;
revoke all on function public.greanlean_record_blockchain_receipt(
  uuid,
  text,
  text,
  text,
  jsonb,
  timestamptz
) from public, anon, authenticated;

grant execute on function public.greanlean_request_blockchain_anchor(
  uuid,
  uuid,
  uuid
) to service_role;
grant execute on function public.greanlean_record_blockchain_receipt(
  uuid,
  text,
  text,
  text,
  jsonb,
  timestamptz
) to service_role;

commit;
