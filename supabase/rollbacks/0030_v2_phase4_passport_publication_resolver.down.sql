begin;

drop function if exists public.v2_withdraw_current_version(uuid,uuid,text,uuid,text);
drop function if exists public.v2_publish_approved_review(uuid,uuid,text,jsonb,text,text,uuid,text);

drop table if exists public.dpp_publication_audit;
drop table if exists public.dpp_current_pointer;
alter table public.dpp_review_task drop constraint if exists dpp_review_published_version_fk;
drop table if exists public.dpp_version;
drop table if exists public.dpp_review_task;
drop table if exists public.resolver_mapping;
drop table if exists public.resolver_host_allowlist;

delete from public.product_subject_identifier
where subject_type = 'PASSPORT' and identifier_type = 'DPP_ID';

alter table public.product_subject_identifier
  drop constraint if exists product_subject_identifier_sensitive_type_check;
alter table public.product_subject_identifier
  add constraint product_subject_identifier_phase2_sensitive_type_check
  check (identifier_type not in ('DPP_ID', 'REGISTRY_ID', 'CREDENTIAL_ID'));
drop index if exists public.product_identifier_tenant_active_unique;
drop index if exists public.product_identifier_global_active_unique;
create unique index product_identifier_tenant_active_unique
  on public.product_subject_identifier(tenant_id, identifier_type, scheme, issuer, normalized_value)
  where status = 'ACTIVE' and identifier_type not in ('GTIN', 'UPI');
create unique index product_identifier_global_active_unique
  on public.product_subject_identifier(identifier_type, scheme, issuer, normalized_value)
  where status = 'ACTIVE' and identifier_type in ('GTIN', 'UPI');

create or replace function public.v2_prepare_product_identifier()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.subject_type = 'PASSPORT' then
    raise exception 'IDENTIFIER_PASSPORT_NOT_ENABLED';
  end if;
  new.normalized_value := public.v2_normalize_product_identifier(new.identifier_type, new.value);
  if new.status = 'RETIRED' then new.is_primary := false; end if;
  return new;
end;
$$;

create or replace function public.v2_validate_product_identifier_subject()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.subject_type = 'FAMILY' and not exists (
    select 1 from public.product_family where id = new.subject_id and tenant_id = new.tenant_id
  ) then raise exception 'TENANT_RELATIONSHIP_MISMATCH';
  elsif new.subject_type = 'MODEL' and not exists (
    select 1 from public.product_model where id = new.subject_id and tenant_id = new.tenant_id
  ) then raise exception 'TENANT_RELATIONSHIP_MISMATCH';
  elsif new.subject_type = 'SKU' and not exists (
    select 1 from public.sku where id = new.subject_id and tenant_id = new.tenant_id
  ) then raise exception 'TENANT_RELATIONSHIP_MISMATCH';
  elsif new.subject_type = 'BATCH' and not exists (
    select 1 from public.product_batch where id = new.subject_id and tenant_id = new.tenant_id
  ) then raise exception 'TENANT_RELATIONSHIP_MISMATCH';
  elsif new.subject_type = 'ITEM' and not exists (
    select 1 from public.product_item where id = new.subject_id and tenant_id = new.tenant_id
  ) then raise exception 'TENANT_RELATIONSHIP_MISMATCH';
  end if;
  return new;
end;
$$;

drop function if exists public.v2_guard_publication_audit();
drop function if exists public.v2_guard_resolver_mapping();
drop function if exists public.v2_validate_current_pointer();
drop function if exists public.v2_guard_dpp_version();
drop function if exists public.v2_guard_dpp_review_task();
drop table if exists public.dpp_passport;
drop function if exists public.v2_guard_dpp_passport_identity();
drop function if exists public.v2_validate_dpp_passport_subject();

delete from public.greanlean_migration_ledger where migration_number = '0030';

commit;
