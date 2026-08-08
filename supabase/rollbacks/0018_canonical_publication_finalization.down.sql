begin;

do $$
begin
  if exists (select 1 from public.dpp_publication limit 1)
    or exists (
      select 1
      from public.dpp_publication_review
      where status = 'PUBLISHED'
      limit 1
    )
  then
    raise exception '0018 rollback refused: canonical publication business data exists';
  end if;
end;
$$;

drop function if exists public.greanlean_publish_final_approved_review(
  uuid,
  text,
  jsonb,
  text,
  uuid
);
drop function if exists public.greanlean_store_final_dpp_publication(
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  uuid,
  uuid
);

grant execute on function public.greanlean_store_dpp_publication(
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  uuid,
  uuid
) to service_role;
grant execute on function public.greanlean_publish_approved_review(
  uuid,
  text,
  uuid
) to service_role;

commit;
