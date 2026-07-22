begin;

drop trigger if exists battery_lifecycle_event_append_only on public.battery_lifecycle_event;
drop trigger if exists battery_disassembly_touch_updated_at on public.battery_disassembly_information;
drop trigger if exists battery_performance_touch_updated_at on public.battery_performance_spec;
drop trigger if exists battery_sustainability_touch_updated_at on public.battery_sustainability_data;
drop trigger if exists battery_material_touch_updated_at on public.battery_material_composition;
drop trigger if exists battery_field_value_touch_updated_at on public.battery_field_value;
drop trigger if exists battery_item_touch_updated_at on public.battery_item;
drop trigger if exists battery_batch_touch_updated_at on public.battery_batch;
drop trigger if exists battery_model_profile_touch_updated_at on public.battery_model_profile;
drop trigger if exists battery_schema_profile_touch_updated_at on public.battery_schema_profile;

drop table if exists public.battery_lifecycle_event;
drop table if exists public.battery_disassembly_information;
drop table if exists public.battery_compliance_document;
drop table if exists public.battery_performance_spec;
drop table if exists public.battery_sustainability_data;
drop table if exists public.battery_material_composition;
drop table if exists public.battery_field_value;
drop table if exists public.battery_item;
drop table if exists public.battery_batch;
drop table if exists public.battery_model_profile;
drop table if exists public.battery_schema_profile;

drop function if exists public.greanlean_prevent_battery_history_mutation();

-- Versioned reference Schema and field rows are intentionally retained.
commit;
