-- GREANLEAN BACKOFFICE ALIGNMENT PHASE 1 ROLLBACK
-- DESTRUCTIVE: use only on a disposable database before any publication or
-- review business data has been created. In all other cases use forward repair.

-- ============================================================================
-- SOURCE: supabase/rollbacks/0017_publication_review_function_permissions.down.sql
-- SHA256: eb0d2db3b956c06c0ae2651757382570e80c504532a52aebb40cd1a5fed012e8
-- ============================================================================
begin;

revoke all on function public.greanlean_decide_publication_review(
  uuid,
  text,
  text
) from public, anon, authenticated;

commit;

-- ============================================================================
-- SOURCE: supabase/rollbacks/0016_dpp_publication_review.down.sql
-- SHA256: d700539b90751e143f22f6de0f9d6ddb6ddd7c6ba538221f583748b800eb5c54
-- ============================================================================
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

-- ============================================================================
-- SOURCE: supabase/rollbacks/0015_dpp_publication_foundation.down.sql
-- SHA256: 5f416030324d82b62ab3e1bb384a3b38537133cf4feeb561409307525dcfa10e
-- ============================================================================
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
