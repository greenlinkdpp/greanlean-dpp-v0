begin;

-- Logical rollback of the runtime search-path repair.
-- This restores the prior configuration and will make unqualified digest calls
-- fail again on Supabase projects where pgcrypto lives in `extensions`.

alter function public.greanlean_prepare_publication_record()
  set search_path = public;

alter function public.greanlean_prepare_publication_review()
  set search_path = public;

alter function public.greanlean_prepare_lifecycle_event()
  set search_path = public;

commit;
