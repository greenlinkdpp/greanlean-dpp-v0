begin;

create or replace function public.greanlean_is_partner_editor(
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.dpp_user_membership membership
    join public.dpp_organisation organisation
      on organisation.id = membership.organisation_id
    where membership.user_id = check_user_id
      and membership.role_code in ('organisation_admin', 'service_provider')
      and membership.status = 'active'
      and membership.valid_from <= now()
      and (membership.valid_until is null or membership.valid_until > now())
      and organisation.verification_status = 'verified'
      and organisation.status = 'active'
  );
$$;

revoke all on function public.greanlean_is_partner_editor(uuid) from public;
grant execute on function public.greanlean_is_partner_editor(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'dpp_field_templates'
      and policyname = 'Partner editors read field templates'
  ) then
    create policy "Partner editors read field templates"
      on public.dpp_field_templates for select to authenticated
      using (public.greanlean_is_partner_editor(auth.uid()));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'Partner editors read assigned products'
  ) then
    create policy "Partner editors read assigned products"
      on public.products for select to authenticated
      using (
        public.greanlean_is_partner_editor(auth.uid())
        and public.greanlean_product_access_level(id, auth.uid()) = 'INTERNAL'
      );
  end if;
end;
$$;

do $$
declare
  target_table text;
  product_tables text[] := array[
    'product_digital_identity',
    'product_materials',
    'product_bom',
    'product_esg_metrics',
    'product_traceability',
    'product_circularity',
    'product_consumer_transparency',
    'product_certificates',
    'product_documents',
    'product_data_governance',
    'product_sector_field_values',
    'supplier_products',
    'dpp_evidence_links'
  ];
begin
  foreach target_table in array product_tables loop
    if to_regclass(format('public.%I', target_table)) is null then
      continue;
    end if;
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
        and policyname = 'Partner editors read assigned ' || target_table
    ) then
      execute format(
        'create policy %I on public.%I for select to authenticated using (
          public.greanlean_is_partner_editor(auth.uid())
          and public.greanlean_product_access_level(product_id, auth.uid()) = ''INTERNAL''
        )',
        'Partner editors read assigned ' || target_table,
        target_table
      );
    end if;
  end loop;
end;
$$;

do $$
declare
  target_table text;
  catalog_tables text[] := array[
    'schema_definition',
    'schema_version',
    'field_definition',
    'battery_metric_type'
  ];
begin
  foreach target_table in array catalog_tables loop
    if to_regclass(format('public.%I', target_table)) is null then
      continue;
    end if;
    execute format('grant select on public.%I to authenticated', target_table);
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
        and policyname = 'Partner editors read ' || target_table
    ) then
      execute format(
        'create policy %I on public.%I for select to authenticated using (
          public.greanlean_is_partner_editor(auth.uid())
        )',
        'Partner editors read ' || target_table,
        target_table
      );
    end if;
  end loop;
end;
$$;

do $$
declare
  target_table text;
  direct_product_tables text[] := array[
    'battery_model_profile',
    'battery_item',
    'battery_operating_metric',
    'battery_lifecycle_event',
    'dpp_field_evidence_link'
  ];
begin
  foreach target_table in array direct_product_tables loop
    if to_regclass(format('public.%I', target_table)) is null then
      continue;
    end if;
    execute format('grant select on public.%I to authenticated', target_table);
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
        and policyname = 'Partner editors read assigned ' || target_table
    ) then
      execute format(
        'create policy %I on public.%I for select to authenticated using (
          public.greanlean_is_partner_editor(auth.uid())
          and public.greanlean_product_access_level(product_id, auth.uid()) = ''INTERNAL''
        )',
        'Partner editors read assigned ' || target_table,
        target_table
      );
    end if;
  end loop;
end;
$$;

do $$
begin
  if to_regclass('public.battery_operating_metric_latest') is not null then
    grant select on public.battery_operating_metric_latest to authenticated;
  end if;

  if to_regclass('public.battery_batch') is not null then
    grant select on public.battery_batch to authenticated;
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'battery_batch'
        and policyname = 'Partner editors read assigned battery batches'
    ) then
      create policy "Partner editors read assigned battery batches"
        on public.battery_batch for select to authenticated
        using (
          public.greanlean_is_partner_editor(auth.uid())
          and exists (
            select 1
            from public.battery_model_profile profile
            where profile.id = battery_batch.battery_model_profile_id
              and public.greanlean_product_access_level(profile.product_id, auth.uid()) = 'INTERNAL'
          )
        );
    end if;
  end if;

  if to_regclass('public.battery_field_value') is not null then
    grant select on public.battery_field_value to authenticated;
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'battery_field_value'
        and policyname = 'Partner editors read assigned battery field values'
    ) then
      create policy "Partner editors read assigned battery field values"
        on public.battery_field_value for select to authenticated
        using (
          public.greanlean_is_partner_editor(auth.uid())
          and exists (
            select 1
            from public.battery_model_profile profile
            where profile.id = battery_field_value.battery_model_profile_id
              and public.greanlean_product_access_level(profile.product_id, auth.uid()) = 'INTERNAL'
          )
        );
    end if;
  end if;
end;
$$;

do $$
declare
  target_user_id uuid;
  target_organisation_id uuid;
  target_membership_id uuid;
  target_product record;
begin
  select id
  into target_user_id
  from auth.users
  where lower(email) = 'orintent@greanlean.com'
  limit 1;

  if target_user_id is null then
    raise exception 'ORINTENT_AUTH_USER_NOT_FOUND';
  end if;

  update auth.users
  set
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
  where id = target_user_id;

  select id
  into target_organisation_id
  from public.dpp_organisation
  where registration_id = 'GREANLEAN-PARTNER-ORINTENT'
  limit 1;

  if target_organisation_id is null then
    insert into public.dpp_organisation (
      legal_name,
      registration_id,
      country_code,
      organisation_type,
      verification_status,
      status,
      verified_at
    ) values (
      'Orintent',
      'GREANLEAN-PARTNER-ORINTENT',
      'CN',
      'service_provider',
      'verified',
      'active',
      now()
    )
    returning id into target_organisation_id;
  else
    update public.dpp_organisation
    set
      legal_name = 'Orintent',
      organisation_type = 'service_provider',
      verification_status = 'verified',
      status = 'active',
      verified_at = coalesce(verified_at, now()),
      updated_at = now()
    where id = target_organisation_id;
  end if;

  insert into public.dpp_user_membership (
    user_id,
    organisation_id,
    role_code,
    status,
    valid_from,
    approved_at
  ) values (
    target_user_id,
    target_organisation_id,
    'organisation_admin',
    'active',
    now(),
    now()
  )
  on conflict (user_id, organisation_id)
  do update set
    role_code = excluded.role_code,
    status = excluded.status,
    valid_from = excluded.valid_from,
    valid_until = null,
    approved_at = excluded.approved_at,
    revoked_by = null,
    revoked_at = null,
    updated_at = now()
  returning id into target_membership_id;

  for target_product in
    select id, dpp_id
    from public.products
    where dpp_id in (
      'DPP-LMT-BAT-48V15AH',
      'DPP-GV-ESS-14K3-000001',
      'DPP-SFJK-31-1-REC',
      'DPP-CE-EARBUDS-001'
    )
  loop
    update public.dpp_product_access_grant
    set
      access_level_code = 'INTERNAL',
      purpose = 'Orintent partner product data maintenance and DPP preview',
      status = 'active',
      valid_from = now(),
      valid_until = null,
      approved_at = now(),
      revoked_by = null,
      revoked_at = null,
      updated_at = now()
    where membership_id = target_membership_id
      and product_id = target_product.id
      and sector_code is null;

    if not found then
      insert into public.dpp_product_access_grant (
        membership_id,
        product_id,
        access_level_code,
        purpose,
        status,
        valid_from,
        approved_at
      ) values (
        target_membership_id,
        target_product.id,
        'INTERNAL',
        'Orintent partner product data maintenance and DPP preview',
        'active',
        now(),
        now()
      );
    end if;
  end loop;
end;
$$;

commit;

select
  users.email,
  organisation.legal_name as organisation,
  membership.role_code,
  membership.status,
  count(grant_row.id) as authorised_products,
  bool_and(grant_row.access_level_code = 'INTERNAL') as internal_product_scope
from auth.users users
join public.dpp_user_membership membership
  on membership.user_id = users.id
join public.dpp_organisation organisation
  on organisation.id = membership.organisation_id
left join public.dpp_product_access_grant grant_row
  on grant_row.membership_id = membership.id
  and grant_row.status = 'active'
where lower(users.email) = 'orintent@greanlean.com'
group by
  users.email,
  organisation.legal_name,
  membership.role_code,
  membership.status;
