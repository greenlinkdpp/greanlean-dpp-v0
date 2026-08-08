-- Repair canonical public snapshot resolution after the CANONICAL cutover.
-- Safe to run repeatedly. No product or publication rows are changed.

begin;

create or replace function public.greanlean_public_canonical_dpp_snapshot(
  target_identifier text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
declare
  active_mode text;
  resolved_product_id uuid;
  target_snapshot jsonb;
begin
  select control.read_mode
  into active_mode
  from public.dpp_publication_read_control control
  where control.singleton = true;

  if active_mode is distinct from 'CANONICAL' then
    return null;
  end if;

  select product.id
  into resolved_product_id
  from public.products product
  where lower(product.status) in ('published', 'updated', 'expired')
    and (
      product.dpp_id = target_identifier
      or product.public_slug = target_identifier
      or exists (
        select 1
        from public.dpp_identifier_alias alias
        where alias.product_id = product.id
          and alias.alias = target_identifier
          and alias.is_active = true
      )
    )
  order by
    case
      when product.dpp_id = target_identifier then 0
      when product.public_slug = target_identifier then 1
      else 2
    end,
    product.id
  limit 1;

  if resolved_product_id is null then
    return null;
  end if;

  select publication.snapshot
  into target_snapshot
  from public.dpp_product_publication_pointer pointer
  join public.dpp_publication publication
    on publication.id = pointer.publication_id
    and publication.product_id = pointer.product_id
    and publication.status = 'PUBLISHED'
  where pointer.product_id = resolved_product_id
  limit 1;

  if target_snapshot is null then
    return null;
  end if;

  return public.greanlean_project_canonical_snapshot(
    target_snapshot,
    'PUBLIC'
  );
end;
$$;

revoke all on function public.greanlean_public_canonical_dpp_snapshot(text)
  from public, anon, authenticated;
grant execute on function public.greanlean_public_canonical_dpp_snapshot(text)
  to anon, authenticated;

commit;
