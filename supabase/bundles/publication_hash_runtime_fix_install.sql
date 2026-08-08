-- GREANLEAN PUBLICATION HASH RUNTIME FIX
-- Safe to run repeatedly after migrations 0015, 0016, and 0019.
-- Does not modify product, review, publication, file, or lifecycle rows.

begin;

do $$
begin
  if to_regprocedure('extensions.digest(bytea,text)') is null then
    raise exception 'The pgcrypto digest(bytea,text) function is unavailable in schema extensions';
  end if;
end;
$$;

alter function public.greanlean_prepare_publication_record()
  set search_path = public, extensions;

alter function public.greanlean_prepare_publication_review()
  set search_path = public, extensions;

alter function public.greanlean_prepare_lifecycle_event()
  set search_path = public, extensions;

commit;
