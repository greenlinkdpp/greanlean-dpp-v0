begin;

do $$
begin
  if to_regclass('public.dpp_publication_review') is not null
    and exists (select 1 from public.dpp_publication_review limit 1)
  then
    raise exception '0016 rollback refused: publication review business data exists';
  end if;
end;
$$;

drop function if exists public.greanlean_publish_approved_review(uuid, text, uuid);
drop function if exists public.greanlean_decide_publication_review(uuid, text, text);
drop function if exists public.greanlean_record_publication_validation(uuid, text, jsonb, uuid);
drop function if exists public.greanlean_create_publication_review(
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  text,
  uuid
);

alter table if exists public.dpp_publication_review
  drop constraint if exists dpp_publication_review_latest_validation_fk;

drop trigger if exists dpp_validation_result_append_only
  on public.dpp_publication_validation_result;
drop trigger if exists dpp_validation_run_append_only
  on public.dpp_publication_validation_run;
drop trigger if exists dpp_publication_review_guard
  on public.dpp_publication_review;
drop trigger if exists dpp_publication_review_prepare
  on public.dpp_publication_review;

drop table if exists public.dpp_publication_validation_result;
drop table if exists public.dpp_publication_validation_run;
drop table if exists public.dpp_publication_review;

drop function if exists public.greanlean_prevent_publication_validation_mutation();
drop function if exists public.greanlean_guard_publication_review();
drop function if exists public.greanlean_prepare_publication_review();

commit;
