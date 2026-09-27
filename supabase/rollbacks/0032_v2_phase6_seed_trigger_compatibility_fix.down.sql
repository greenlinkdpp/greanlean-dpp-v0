begin;

create or replace function public.greanlean_p0_validate_battery_hierarchy()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  model_record public.battery_model_profile%rowtype;
  batch_record public.battery_batch%rowtype;
  owner_organisation_id uuid;
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

  if tg_table_name = 'battery_item' and new.battery_batch_id is not null then
    select * into batch_record from public.battery_batch where id = new.battery_batch_id;
    if batch_record.id is null
      or batch_record.product_id <> new.product_id
      or batch_record.battery_model_profile_id <> new.battery_model_profile_id
      or batch_record.organisation_id is distinct from new.organisation_id
    then
      raise exception 'BATTERY_ITEM_BATCH_MISMATCH' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

delete from public.greanlean_migration_ledger where migration_number = '0032';

commit;
