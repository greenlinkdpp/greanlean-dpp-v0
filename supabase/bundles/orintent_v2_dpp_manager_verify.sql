select
  lower(users.email) as email,
  tenant.code as tenant_code,
  membership.status as membership_status,
  role.code as role_code,
  role.role_class,
  bool_and(capability.code not in (
    'dpp.approve',
    'dpp.publish',
    'dpp.withdraw',
    'membership.manage',
    'tenant.manage'
  )) as privileged_capabilities_excluded,
  count(capability.id) filter (
    where capability.code in ('product.view', 'product.edit', 'dpp.view', 'dpp.edit')
  ) = 4 as product_and_dpp_access_present
from auth.users users
join public.tenant_membership membership
  on membership.user_id = users.id
join public.tenant tenant
  on tenant.id = membership.tenant_id
join public.role role
  on role.id = membership.role_id
left join public.role_capability role_capability
  on role_capability.role_id = role.id
left join public.capability capability
  on capability.id = role_capability.capability_id
where lower(users.email) = 'orintent@greanlean.com'
  and tenant.code = 'greanlean-reference-mobility'
group by
  users.email,
  tenant.code,
  membership.status,
  role.code,
  role.role_class;
