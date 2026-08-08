-- GREANLEAN BACKOFFICE ALIGNMENT M6 LOGICAL ROLLBACK
-- Restores LEGACY read mode and deliberately preserves migration evidence.

-- ============================================================================
-- SOURCE: supabase/rollbacks/0021_publication_backfill_and_read_cutover.down.sql
-- SHA256: ab6b270cca9e4dab3b384891e37c892e354273ad21786ae92cb4d605ee9a1d52
-- ============================================================================
begin;

do $$
begin
  if to_regclass('public.dpp_publication_read_control') is not null then
    update public.dpp_publication_read_control
    set read_mode = 'LEGACY', updated_at = now()
    where singleton = true;
  end if;
end;
$$;

commit;
