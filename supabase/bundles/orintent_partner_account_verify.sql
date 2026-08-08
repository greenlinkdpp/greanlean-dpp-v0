with target as (
  select
    users.email,
    users.email_confirmed_at,
    organisation.legal_name,
    organisation.organisation_type,
    organisation.verification_status,
    membership.id as membership_id,
    membership.role_code,
    membership.status
  from auth.users users
  join public.dpp_user_membership membership
    on membership.user_id = users.id
  join public.dpp_organisation organisation
    on organisation.id = membership.organisation_id
  where lower(users.email) = 'orintent@greanlean.com'
),
grant_summary as (
  select
    count(*) as grant_count,
    count(*) filter (
      where grant_row.access_level_code = 'INTERNAL'
        and grant_row.status = 'active'
        and products.dpp_id in (
          'DPP-LMT-BAT-48V15AH',
          'DPP-GV-ESS-14K3-000001',
          'DPP-SFJK-31-1-REC',
          'DPP-CE-EARBUDS-001'
        )
    ) as expected_grant_count,
    count(*) filter (where grant_row.sector_code is not null) as sector_grant_count
  from target
  join public.dpp_product_access_grant grant_row
    on grant_row.membership_id = target.membership_id
  left join public.products products
    on products.id = grant_row.product_id
),
policy_summary as (
  select count(*) as policy_count
  from pg_policies
  where schemaname = 'public'
    and policyname like 'Partner editors read%'
)
select
  exists (
    select 1
    from target
    where email_confirmed_at is not null
      and legal_name = 'Orintent'
      and organisation_type = 'service_provider'
      and verification_status = 'verified'
      and role_code = 'organisation_admin'
      and status = 'active'
  ) as partner_identity_passed,
  grant_count = 4 as four_product_grants_passed,
  expected_grant_count = 4 as internal_product_scope_passed,
  sector_grant_count = 0 as no_sector_wide_access_passed,
  policy_count >= 3 as partner_read_policies_passed
from grant_summary
cross join policy_summary;
