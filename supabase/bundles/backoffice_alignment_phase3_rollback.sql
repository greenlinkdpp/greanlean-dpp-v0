-- GREANLEAN BACKOFFICE ALIGNMENT M4 ROLLBACK
-- Refuses rollback after M4 business data exists.

-- ============================================================================
-- SOURCE: supabase/rollbacks/0019_file_evidence_lifecycle_foundation.down.sql
-- SHA256: b5b4e5da1a8441009be933a1e5b4335eecfa3c4d87ce4ef09948c0534f4dc447
-- ============================================================================
begin;

revoke execute on function public.greanlean_access_rank(text) from service_role;

do $$
begin
  if exists (select 1 from public.dpp_file_asset limit 1)
    or exists (select 1 from public.dpp_file_version limit 1)
    or exists (select 1 from public.dpp_field_evidence_link limit 1)
    or exists (select 1 from public.dpp_lifecycle_event limit 1)
  then
    raise exception '0019 rollback refused: M4 file, evidence, or lifecycle business data exists';
  end if;
end;
$$;

drop function if exists public.greanlean_append_lifecycle_event(
  uuid,
  text,
  text,
  text,
  timestamptz,
  jsonb,
  text,
  jsonb,
  text,
  text,
  text,
  uuid,
  uuid,
  text,
  uuid
);
drop function if exists public.greanlean_link_file_evidence(
  uuid,
  uuid,
  text,
  text,
  jsonb,
  text,
  text,
  uuid,
  uuid
);
drop function if exists public.greanlean_append_file_version(
  uuid,
  integer,
  text,
  text,
  text,
  text,
  bigint,
  text,
  uuid,
  uuid
);
drop function if exists public.greanlean_create_file_asset(
  uuid,
  text,
  text,
  text,
  text,
  text,
  uuid
);

drop trigger if exists dpp_lifecycle_append_only on public.dpp_lifecycle_event;
drop trigger if exists dpp_lifecycle_prepare on public.dpp_lifecycle_event;
drop trigger if exists dpp_field_evidence_append_only on public.dpp_field_evidence_link;
drop trigger if exists dpp_field_evidence_validate on public.dpp_field_evidence_link;
drop trigger if exists dpp_file_version_append_only on public.dpp_file_version;
drop trigger if exists dpp_file_asset_touch on public.dpp_file_asset;

drop function if exists public.greanlean_prepare_lifecycle_event();
drop function if exists public.greanlean_validate_file_evidence_link();
drop function if exists public.greanlean_prevent_m4_history_mutation();
drop function if exists public.greanlean_touch_dpp_file_asset();

drop table if exists public.dpp_lifecycle_event;
drop table if exists public.dpp_field_evidence_link;
drop table if exists public.dpp_file_version;
drop table if exists public.dpp_file_asset;

commit;
