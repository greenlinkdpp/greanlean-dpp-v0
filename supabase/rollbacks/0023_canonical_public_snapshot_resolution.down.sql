begin;

create or replace function public.greanlean_public_canonical_dpp_snapshot(
  target_identifier text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  active_mode text;
  target_snapshot jsonb;
begin
  select read_mode into active_mode
  from public.dpp_publication_read_control
  where singleton = true;
  if active_mode is distinct from 'CANONICAL' then
    return null;
  end if;

  select publication.snapshot
  into target_snapshot
  from public.products product
  join public.dpp_product_publication_pointer pointer
    on pointer.product_id = product.id
  join public.dpp_publication publication
    on publication.id = pointer.publication_id
    and publication.product_id = product.id
    and publication.status = 'PUBLISHED'
  where (
    product.dpp_id = target_identifier
    or product.public_slug = target_identifier
    or product.id = (
      select alias.product_id
      from public.dpp_identifier_alias alias
      where alias.alias = target_identifier
        and alias.is_active = true
      limit 1
    )
  )
    and product.status in ('published', 'updated', 'expired')
  limit 1;

  return public.greanlean_project_canonical_snapshot(target_snapshot, 'PUBLIC');
end;
$$;

revoke all on function public.greanlean_public_canonical_dpp_snapshot(text)
  from public, anon, authenticated;
grant execute on function public.greanlean_public_canonical_dpp_snapshot(text)
  to anon, authenticated;

commit;
