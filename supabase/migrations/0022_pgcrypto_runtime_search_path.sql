begin;

-- Make pgcrypto hashing available to existing publication and lifecycle trigger
-- functions without widening their search path beyond controlled schemas.

do $$
begin
  if to_regprocedure('extensions.digest(bytea,text)') is null then
    raise exception '0022 requires extensions.digest(bytea,text)';
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
