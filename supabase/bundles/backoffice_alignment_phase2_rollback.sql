-- GREANLEAN BACKOFFICE ALIGNMENT M3 ROLLBACK
-- Use only before canonical publication business data exists.

-- ============================================================================
-- SOURCE: supabase/rollbacks/0018_canonical_publication_finalization.down.sql
-- SHA256: bca5839e82672096f7ee890348bb3e5d07d6a19088034ff1e861db8ae7cf5e37
-- ============================================================================
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
