begin;

do $$
begin
  if to_regclass('public.dpp_publication_review') is not null then
    raise exception 'Rollback migration 0016 before rolling back 0015';
  end if;

  if to_regclass('public.dpp_publication') is not null
    and exists (select 1 from public.dpp_publication limit 1)
  then
    raise exception '0015 rollback refused: publication business data exists';
  end if;
end;
$$;

drop function if exists public.greanlean_withdraw_current_dpp_publication(
  uuid,
  uuid,
  text,
  uuid
);
drop function if exists public.greanlean_store_dpp_publication(
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  uuid,
  uuid
);

drop trigger if exists dpp_publication_pointer_validate
  on public.dpp_product_publication_pointer;
drop trigger if exists dpp_publication_content_immutable
  on public.dpp_publication;
drop trigger if exists dpp_publication_prepare_record
  on public.dpp_publication;

drop table if exists public.dpp_product_publication_pointer;
drop table if exists public.dpp_publication;

drop function if exists public.greanlean_validate_publication_pointer();
drop function if exists public.greanlean_prevent_publication_mutation();
drop function if exists public.greanlean_prepare_publication_record();
drop function if exists public.greanlean_publication_snapshot_is_well_formed(jsonb);

commit;
