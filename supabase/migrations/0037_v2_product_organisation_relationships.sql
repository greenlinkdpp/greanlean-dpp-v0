begin;

do $$
begin
  if not exists (select 1 from public.greanlean_migration_ledger where migration_number = '0036' and result = 'applied') then
    raise exception '0037 requires migration 0036';
  end if;
end;
$$;

-- A responsibility is a relationship, not a second kind of Organisation.  A
-- nullable SKU ref lets a Model default be refined by a SKU-specific party.
create table public.product_organisation_relation (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenant(id) on delete restrict,
  product_model_id uuid not null,
  sku_id uuid,
  organisation_id uuid not null,
  relation_type text not null check (relation_type in (
    'MANUFACTURER', 'BRAND_OWNER', 'SUPPLIER', 'IMPORTER', 'DISTRIBUTOR',
    'RECYCLER', 'REPAIRER', 'CERTIFIER', 'ECONOMIC_OPERATOR',
    'FACTORY_FACILITY', 'CELL_SUPPLIER', 'BMS_SUPPLIER', 'PACK_MANUFACTURER'
  )),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  constraint product_organisation_relation_model_fk foreign key (product_model_id, tenant_id)
    references public.product_model(id, tenant_id) on delete restrict,
  constraint product_organisation_relation_sku_fk foreign key (sku_id, tenant_id, product_model_id)
    references public.sku(id, tenant_id, model_id) on delete restrict,
  constraint product_organisation_relation_organisation_fk foreign key (organisation_id, tenant_id)
    references public.organisation_v2(id, tenant_id) on delete restrict,
  unique nulls not distinct (tenant_id, product_model_id, sku_id, organisation_id, relation_type)
);

create index product_organisation_relation_model_idx
  on public.product_organisation_relation(tenant_id, product_model_id, status);
create index product_organisation_relation_organisation_idx
  on public.product_organisation_relation(tenant_id, organisation_id, status);

create trigger product_organisation_relation_touch_updated_at
before update on public.product_organisation_relation
for each row execute function public.v2_touch_updated_at();
create trigger product_organisation_relation_tenant_immutable
before update on public.product_organisation_relation
for each row execute function public.v2_reject_tenant_change();

alter table public.product_organisation_relation enable row level security;
create policy product_organisation_relation_select on public.product_organisation_relation for select to authenticated
using (public.v2_user_has_capability(tenant_id, 'product.view'));
create policy product_organisation_relation_insert on public.product_organisation_relation for insert to authenticated
with check (public.v2_user_has_capability(tenant_id, 'product.edit'));
create policy product_organisation_relation_update on public.product_organisation_relation for update to authenticated
using (public.v2_user_has_capability(tenant_id, 'product.edit'))
with check (public.v2_user_has_capability(tenant_id, 'product.edit'));
create policy product_organisation_relation_delete on public.product_organisation_relation for delete to authenticated
using (public.v2_user_has_capability(tenant_id, 'product.edit'));

comment on table public.product_organisation_relation is
  'Tenant-scoped Product Model/SKU responsibility relation. Organisation remains a separate real-world entity.';

insert into public.greanlean_migration_ledger (migration_number, migration_name, checksum_sha256, environment, applied_by, result, notes)
values ('0037', 'v2_product_organisation_relationships', null, 'preproduction', 'codex', 'applied',
  'Add tenant-enforced reusable Product Model/SKU responsibility relationships; no V1 objects changed.')
on conflict (migration_number) do update set migration_name = excluded.migration_name, environment = excluded.environment, applied_by = excluded.applied_by, applied_at = now(), result = excluded.result, notes = excluded.notes;

commit;
