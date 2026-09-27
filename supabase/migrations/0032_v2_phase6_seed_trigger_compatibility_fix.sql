begin;

-- The Phase 0 hierarchy guard is shared by battery_batch and battery_item.
-- Accessing NEW.battery_batch_id directly is unsafe for battery_batch rows,
-- because that relation has no such column. Extract the item-only field from
-- the trigger record as JSON so the shared trigger remains relation-safe.
create or replace function public.greanlean_p0_validate_battery_hierarchy()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  model_record public.battery_model_profile%rowtype;
  batch_record public.battery_batch%rowtype;
  owner_organisation_id uuid;
  item_batch_id uuid;
begin
  select * into model_record
  from public.battery_model_profile
  where id = new.battery_model_profile_id;

  if model_record.id is null or model_record.product_id <> new.product_id then
    raise exception 'BATTERY_MODEL_PRODUCT_MISMATCH' using errcode = '23514';
  end if;

  if new.organisation_id is not null then
    if model_record.organisation_id is distinct from new.organisation_id then
      raise exception 'BATTERY_MODEL_ORGANISATION_MISMATCH' using errcode = '23514';
    end if;
    select ownership.organisation_id into owner_organisation_id
    from public.dpp_product_ownership ownership
    where ownership.product_id = new.product_id and ownership.ownership_status = 'ACTIVE';
    if owner_organisation_id is distinct from new.organisation_id then
      raise exception 'BATTERY_PRODUCT_ORGANISATION_MISMATCH' using errcode = '23514';
    end if;
  end if;

  if tg_table_name = 'battery_item' then
    item_batch_id := nullif(to_jsonb(new)->>'battery_batch_id', '')::uuid;
    if item_batch_id is not null then
      select * into batch_record from public.battery_batch where id = item_batch_id;
      if batch_record.id is null
        or batch_record.product_id <> new.product_id
        or batch_record.battery_model_profile_id <> new.battery_model_profile_id
        or batch_record.organisation_id is distinct from new.organisation_id
      then
        raise exception 'BATTERY_ITEM_BATCH_MISMATCH' using errcode = '23514';
      end if;
    end if;
  end if;
  return new;
end;
$$;

insert into public.greanlean_migration_ledger(
  migration_number, migration_name, checksum_sha256, environment,
  applied_by, result, notes
)
values (
  '0032', 'v2_phase6_seed_trigger_compatibility_fix', null, 'development',
  'codex', 'applied',
  'Makes the shared Phase 0 battery hierarchy trigger relation-safe and closes the historical Development seed failure.'
)
on conflict (migration_number) do update set
  migration_name = excluded.migration_name,
  environment = excluded.environment,
  applied_by = excluded.applied_by,
  applied_at = now(),
  result = excluded.result,
  notes = excluded.notes;

commit;
