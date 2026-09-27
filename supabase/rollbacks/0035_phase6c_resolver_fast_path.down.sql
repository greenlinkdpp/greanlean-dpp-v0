begin;

drop function if exists public.v2_phase6c_resolve_public_passport(text,text,text[]);
drop index if exists public.product_identifier_normalized_active_idx;
delete from public.greanlean_migration_ledger where migration_number = '0035';

commit;
