begin;

delete from public.tenant_membership
where user_id = (
  select id from auth.users
  where lower(email) = 'orintent@greanlean.com'
  limit 1
)
and tenant_id = (
  select id from public.tenant
  where code = 'greanlean-reference-mobility'
  limit 1
);

commit;
