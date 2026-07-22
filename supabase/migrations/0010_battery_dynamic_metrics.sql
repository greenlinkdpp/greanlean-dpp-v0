begin;

create table if not exists public.battery_metric_type (
  code text primary key,
  label_en text not null,
  label_zh text not null,
  default_unit text,
  source_field_code text,
  access_level_code text not null default 'LEGITIMATE_INTEREST' references public.access_level(code) on delete restrict,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint battery_metric_type_status_check check (status in ('draft', 'active', 'retired'))
);

create table if not exists public.battery_operating_metric (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  battery_item_id uuid not null references public.battery_item(id) on delete cascade,
  metric_type text not null references public.battery_metric_type(code) on delete restrict,
  metric_value numeric not null,
  unit text not null,
  measured_at timestamptz not null,
  data_source text not null,
  source_device text,
  source_device_key text generated always as (coalesce(source_device, '')) stored,
  verification_status text not null default 'unverified',
  access_level_code text not null default 'LEGITIMATE_INTEREST' references public.access_level(code) on delete restrict,
  ingestion_key text,
  created_at timestamptz not null default now(),
  unique (battery_item_id, metric_type, measured_at, source_device_key),
  unique (ingestion_key),
  constraint battery_metric_verification_check check (verification_status in ('unverified', 'in_review', 'verified', 'rejected')),
  constraint battery_metric_ingestion_key_check check (ingestion_key is null or length(ingestion_key) between 8 and 200)
);

insert into public.battery_metric_type (code, label_en, label_zh, default_unit, source_field_code, access_level_code)
values
  ('REMAINING_CAPACITY', 'Remaining capacity', '剩余容量', 'Ah', 'battery.remaining_capacity', 'LEGITIMATE_INTEREST'),
  ('CAPACITY_FADE', 'Capacity fade', '容量衰减', '%', 'battery.capacity_fade', 'LEGITIMATE_INTEREST'),
  ('REMAINING_USABLE_ENERGY', 'Remaining usable battery energy', '剩余可用电池能量', 'kWh', 'battery.remaining_usable_battery_energy', 'LEGITIMATE_INTEREST'),
  ('SOCE', 'State of certified energy', '认证能量状态', '%', 'battery.state_of_certified_energy_soce', 'LEGITIMATE_INTEREST'),
  ('SOC', 'State of charge', '荷电状态', '%', 'battery.state_of_charge_soc', 'LEGITIMATE_INTEREST'),
  ('REMAINING_POWER_CAPABILITY', 'Remaining power capability', '剩余功率能力', 'W', 'battery.remaining_power_capability', 'LEGITIMATE_INTEREST'),
  ('POWER_FADE', 'Power fade', '功率衰减', '%', 'battery.power_fade', 'LEGITIMATE_INTEREST'),
  ('REMAINING_ROUND_TRIP_EFFICIENCY', 'Remaining round trip efficiency', '剩余往返能量效率', '%', 'battery.remaining_round_trip_energy_efficiency', 'LEGITIMATE_INTEREST'),
  ('ROUND_TRIP_EFFICIENCY_FADE', 'Round trip efficiency fade', '往返能量效率衰减', '%', 'battery.energy_round_trip_efficiency_fade', 'LEGITIMATE_INTEREST'),
  ('CURRENT_SELF_DISCHARGE_RATE', 'Current self-discharge rate', '当前自放电率', '%/month', 'battery.current_self_discharge_rate', 'LEGITIMATE_INTEREST'),
  ('SELF_DISCHARGE_EVOLUTION', 'Evolution of self-discharge rates', '自放电率变化', '%', 'battery.evolution_of_self_discharge_rates', 'LEGITIMATE_INTEREST'),
  ('INTERNAL_RESISTANCE_INCREASE', 'Internal resistance increase', '内阻增长', '%', 'battery.internal_resistance_increase_of_pack_cell_and_module_recommended', 'LEGITIMATE_INTEREST'),
  ('FULL_CYCLE_COUNT', 'Full charging and discharging cycles', '完整充放电循环次数', 'cycle', 'battery.number_of_full_charging_and_discharging_cycles', 'LEGITIMATE_INTEREST'),
  ('ENERGY_THROUGHPUT', 'Energy throughput', '能量吞吐量', 'kWh', 'battery.energy_throughput', 'LEGITIMATE_INTEREST'),
  ('CAPACITY_THROUGHPUT', 'Capacity throughput', '容量吞吐量', 'Ah', 'battery.capacity_throughput', 'LEGITIMATE_INTEREST'),
  ('TEMPERATURE', 'Temperature information', '温度信息', '°C', 'battery.temperature_information', 'LEGITIMATE_INTEREST'),
  ('HIGH_TEMPERATURE_DURATION', 'Time above temperature boundary', '高于温度边界的持续时间', 'h', 'battery.time_spent_in_extreme_temperatures_above_boundary', 'LEGITIMATE_INTEREST'),
  ('LOW_TEMPERATURE_DURATION', 'Time below temperature boundary', '低于温度边界的持续时间', 'h', 'battery.time_spent_in_extreme_temperatures_below_boundary', 'LEGITIMATE_INTEREST'),
  ('HIGH_TEMPERATURE_CHARGING_DURATION', 'Charging time above temperature boundary', '高温边界以上充电持续时间', 'h', 'battery.time_spent_charging_during_extreme_temperatures_above_boundary', 'LEGITIMATE_INTEREST'),
  ('LOW_TEMPERATURE_CHARGING_DURATION', 'Charging time below temperature boundary', '低温边界以下充电持续时间', 'h', 'battery.time_spent_charging_during_extreme_temperatures_below_boundary', 'LEGITIMATE_INTEREST'),
  ('DEEP_DISCHARGE_EVENT_COUNT', 'Deep discharge event count', '深度放电事件次数', 'count', 'battery.number_of_deep_discharge_events', 'LEGITIMATE_INTEREST'),
  ('OVERCHARGE_EVENT_COUNT', 'Overcharge event count', '过充事件次数', 'count', 'battery.number_of_overcharge_events', 'LEGITIMATE_INTEREST'),
  ('SOH_VOLUNTARY', 'State of health (voluntary)', '健康状态（自愿）', '%', null, 'LEGITIMATE_INTEREST')
on conflict (code) do update set
  label_en = excluded.label_en,
  label_zh = excluded.label_zh,
  default_unit = excluded.default_unit,
  source_field_code = excluded.source_field_code,
  access_level_code = excluded.access_level_code;

create index if not exists battery_metric_item_time_idx
  on public.battery_operating_metric (battery_item_id, metric_type, measured_at desc);
create index if not exists battery_metric_product_time_idx
  on public.battery_operating_metric (product_id, measured_at desc);

create or replace view public.battery_operating_metric_latest
with (security_invoker = true)
as
select distinct on (battery_item_id, metric_type)
  id,
  product_id,
  battery_item_id,
  metric_type,
  metric_value,
  unit,
  measured_at,
  data_source,
  source_device,
  verification_status,
  access_level_code,
  created_at
from public.battery_operating_metric
order by battery_item_id, metric_type, measured_at desc, created_at desc;

comment on view public.battery_operating_metric_latest is
  'Read-only latest-value projection. The underlying operating metric history remains append-only.';

drop trigger if exists battery_operating_metric_append_only on public.battery_operating_metric;
create trigger battery_operating_metric_append_only
  before update or delete on public.battery_operating_metric
  for each row execute function public.greanlean_prevent_battery_history_mutation();

alter table public.battery_metric_type enable row level security;
alter table public.battery_operating_metric enable row level security;

drop policy if exists "Public can read battery metric types" on public.battery_metric_type;
create policy "Public can read battery metric types" on public.battery_metric_type
  for select to anon, authenticated using (status = 'active');

drop policy if exists "Public can read public battery operating metrics" on public.battery_operating_metric;
create policy "Public can read public battery operating metrics" on public.battery_operating_metric
  for select to anon, authenticated using (
    access_level_code = 'PUBLIC'
    and exists (select 1 from public.products p where p.id = product_id and p.status in ('published', 'updated', 'expired'))
  );

commit;
