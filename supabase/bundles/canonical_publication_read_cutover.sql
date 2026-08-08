-- Switch public DPP reads to the four approved immutable publications.
-- Safe to run repeatedly after all four current publication pointers exist.

begin;

do $$
declare
  current_publication_count integer;
begin
  select count(*)
  into current_publication_count
  from public.products product
  join public.dpp_product_publication_pointer pointer
    on pointer.product_id = product.id
  join public.dpp_publication publication
    on publication.id = pointer.publication_id
    and publication.product_id = pointer.product_id
    and publication.status = 'PUBLISHED'
  where product.dpp_id in (
    'DPP-LMT-BAT-48V15AH',
    'DPP-GV-ESS-14K3-000001',
    'DPP-SFJK-31-1-REC',
    'DPP-CE-EARBUDS-001'
  );

  if current_publication_count <> 4 then
    raise exception
      'Canonical read cutover requires four current publications; found %',
      current_publication_count;
  end if;
end;
$$;

select public.greanlean_set_publication_read_mode(
  'CANONICAL',
  'ad5aba5a-7cd5-4d26-8178-6a8c38051abb'::uuid
) as cutover_result;

commit;

select
  read_mode,
  updated_by,
  updated_at
from public.dpp_publication_read_control
where singleton = true;
