begin;

insert into public.battery_model_profile (
  product_id,
  schema_profile_id,
  legal_category_code,
  technical_variant_code,
  passport_applicability,
  applicability_reason,
  battery_model_identifier,
  rated_capacity_value,
  rated_capacity_unit,
  rated_energy_kwh,
  battery_mass_kg,
  battery_chemistry_code,
  bms_present,
  stationary,
  economic_operator_name,
  manufacturer_name,
  manufacturing_place,
  warranty_description,
  source_type,
  verification_status
)
select
  product.id,
  schema_profile.id,
  'industrial',
  'stationary_above_2kwh',
  'REQUIRED',
  '额定能量超过 2 kWh 的固定式可充电工业电池，属于电池护照适用范围。',
  'GV-ESS-14K3-2026',
  280,
  'Ah',
  14.336,
  115,
  'LFP',
  true,
  true,
  'GreenVault Energy Systems GmbH',
  'GreenVault Energy Systems GmbH',
  'Hamburg, Germany',
  '10 年或 6000 次循环，以先到者为准。',
  'INITIAL_DATASET',
  'unverified'
from public.products product
left join public.battery_schema_profile schema_profile
  on schema_profile.code = 'battery.industrial.stationary_above_2kwh'
where product.dpp_id = 'DPP-GV-ESS-14K3-000001'
on conflict (product_id) do update set
  schema_profile_id = excluded.schema_profile_id,
  legal_category_code = excluded.legal_category_code,
  technical_variant_code = excluded.technical_variant_code,
  passport_applicability = excluded.passport_applicability,
  applicability_reason = excluded.applicability_reason,
  battery_model_identifier = excluded.battery_model_identifier,
  rated_capacity_value = excluded.rated_capacity_value,
  rated_capacity_unit = excluded.rated_capacity_unit,
  rated_energy_kwh = excluded.rated_energy_kwh,
  battery_mass_kg = excluded.battery_mass_kg,
  battery_chemistry_code = excluded.battery_chemistry_code,
  bms_present = excluded.bms_present,
  stationary = excluded.stationary,
  economic_operator_name = excluded.economic_operator_name,
  manufacturer_name = excluded.manufacturer_name,
  manufacturing_place = excluded.manufacturing_place,
  warranty_description = excluded.warranty_description,
  source_type = excluded.source_type,
  verification_status = excluded.verification_status,
  updated_at = now()
where public.battery_model_profile.verification_status <> 'verified';

insert into public.battery_item (
  battery_model_profile_id,
  product_id,
  serial_identifier,
  unique_product_identifier,
  battery_status_code,
  commissioned_at,
  visibility_level,
  verification_status
)
select
  profile.id,
  product.id,
  item_seed.serial_identifier,
  item_seed.unique_product_identifier,
  'original',
  current_date - interval '30 days',
  'LEGITIMATE_INTEREST',
  'unverified'
from public.products product
join public.battery_model_profile profile
  on profile.product_id = product.id
cross join lateral (
  values (
    case
      when product.dpp_id = 'DPP-LMT-BAT-48V15AH' then 'LMT-48V15AH-000001'
      else 'GV14K3-000001'
    end,
    case
      when product.dpp_id = 'DPP-LMT-BAT-48V15AH'
        then 'https://greanlean.com/p/DPP-LMT-BAT-48V15AH'
      else 'https://greanlean.com/p/DPP-GV-ESS-14K3-000001'
    end
  )
) as item_seed(serial_identifier, unique_product_identifier)
where product.dpp_id in (
  'DPP-LMT-BAT-48V15AH',
  'DPP-GV-ESS-14K3-000001'
)
on conflict (unique_product_identifier) do update set
  battery_model_profile_id = excluded.battery_model_profile_id,
  product_id = excluded.product_id,
  serial_identifier = excluded.serial_identifier,
  battery_status_code = excluded.battery_status_code,
  commissioned_at = excluded.commissioned_at,
  visibility_level = excluded.visibility_level,
  verification_status = excluded.verification_status,
  updated_at = now();

with target_items as (
  select
    product.id as product_id,
    product.dpp_id,
    item.id as battery_item_id
  from public.products product
  join public.battery_item item
    on item.product_id = product.id
  where item.unique_product_identifier in (
    'https://greanlean.com/p/DPP-LMT-BAT-48V15AH',
    'https://greanlean.com/p/DPP-GV-ESS-14K3-000001'
  )
),
daily_points as (
  select
    target_items.*,
    day_index,
    date_trunc('day', now())
      - ((29 - day_index) || ' days')::interval
      + interval '08:00:00' as measured_at
  from target_items
  cross join generate_series(0, 29) as day_index
),
metric_values as (
  select
    daily_points.product_id,
    daily_points.battery_item_id,
    daily_points.dpp_id,
    daily_points.day_index,
    daily_points.measured_at,
    metric.metric_type,
    metric.metric_value,
    metric.unit
  from daily_points
  cross join lateral (
    values
      (
        'SOC',
        case
          when daily_points.dpp_id = 'DPP-LMT-BAT-48V15AH'
            then 56 + ((daily_points.day_index * 7) % 34)
          else 61 + ((daily_points.day_index * 5) % 29)
        end::numeric,
        '%'
      ),
      (
        'SOH_VOLUNTARY',
        case
          when daily_points.dpp_id = 'DPP-LMT-BAT-48V15AH'
            then 99.10 - daily_points.day_index * 0.02
          else 99.50 - daily_points.day_index * 0.01
        end::numeric,
        '%'
      ),
      (
        'FULL_CHARGE_CAPACITY',
        case
          when daily_points.dpp_id = 'DPP-LMT-BAT-48V15AH'
            then 14.90 - daily_points.day_index * 0.01
          else 278.00 - daily_points.day_index * 0.05
        end::numeric,
        'Ah'
      ),
      (
        'REMAINING_CAPACITY',
        case
          when daily_points.dpp_id = 'DPP-LMT-BAT-48V15AH'
            then (14.90 - daily_points.day_index * 0.01)
              * (56 + ((daily_points.day_index * 7) % 34)) / 100
          else (278.00 - daily_points.day_index * 0.05)
              * (61 + ((daily_points.day_index * 5) % 29)) / 100
        end::numeric,
        'Ah'
      ),
      (
        'FULL_CYCLE_COUNT',
        case
          when daily_points.dpp_id = 'DPP-LMT-BAT-48V15AH'
            then 42 + daily_points.day_index
          else 120 + daily_points.day_index * 2
        end::numeric,
        'cycle'
      ),
      (
        'TEMPERATURE',
        case
          when daily_points.dpp_id = 'DPP-LMT-BAT-48V15AH'
            then 21 + ((daily_points.day_index * 3) % 8)
          else 24 + ((daily_points.day_index * 2) % 7)
        end::numeric,
        '°C'
      ),
      (
        'CURRENT_INTERNAL_RESISTANCE',
        case
          when daily_points.dpp_id = 'DPP-LMT-BAT-48V15AH'
            then 82.00 + daily_points.day_index * 0.05
          else 18.00 + daily_points.day_index * 0.02
        end::numeric,
        'mOhm'
      ),
      (
        'ENERGY_THROUGHPUT',
        case
          when daily_points.dpp_id = 'DPP-LMT-BAT-48V15AH'
            then 30.20 + daily_points.day_index * 0.70
          else 1080.00 + daily_points.day_index * 12.00
        end::numeric,
        'kWh'
      ),
      (
        'REMAINING_POWER_CAPABILITY',
        case
          when daily_points.dpp_id = 'DPP-LMT-BAT-48V15AH'
            then 650.00 - daily_points.day_index * 1.50
          else 9500.00 - daily_points.day_index * 5.00
        end::numeric,
        'W'
      )
  ) as metric(metric_type, metric_value, unit)
)
insert into public.battery_operating_metric (
  product_id,
  battery_item_id,
  metric_type,
  metric_value,
  unit,
  measured_at,
  received_at,
  data_source,
  source_device,
  quality_status,
  verification_status,
  collection_mode,
  access_level_code,
  ingestion_key
)
select
  metric_values.product_id,
  metric_values.battery_item_id,
  metric_values.metric_type,
  round(metric_values.metric_value, 2),
  metric_values.unit,
  metric_values.measured_at,
  metric_values.measured_at + interval '5 seconds',
  'INITIAL_DATASET',
  'INITIAL-IMPORT',
  'UNKNOWN',
  'UNVERIFIED',
  'DAILY_SNAPSHOT',
  'LEGITIMATE_INTEREST',
  'phase5-initial:'
    || metric_values.battery_item_id::text
    || ':'
    || lower(metric_values.metric_type)
    || ':'
    || to_char(metric_values.measured_at, 'YYYYMMDD')
from metric_values
on conflict (ingestion_key) do nothing;

with target_items as (
  select
    product.id as product_id,
    item.id as battery_item_id,
    item.serial_identifier
  from public.products product
  join public.battery_item item
    on item.product_id = product.id
  where item.unique_product_identifier in (
    'https://greanlean.com/p/DPP-LMT-BAT-48V15AH',
    'https://greanlean.com/p/DPP-GV-ESS-14K3-000001'
  )
)
insert into public.battery_lifecycle_event (
  product_id,
  battery_item_id,
  event_type,
  event_time,
  event_data,
  data_source,
  received_at,
  quality_status,
  verification_status,
  collection_mode,
  access_level_code,
  idempotency_key
)
select
  target_items.product_id,
  target_items.battery_item_id,
  event.event_type,
  event.event_time,
  event.event_data,
  'INITIAL_DATASET',
  event.event_time + interval '5 seconds',
  'UNKNOWN',
  'UNVERIFIED',
  event.collection_mode,
  'LEGITIMATE_INTEREST',
  'phase5-initial:'
    || target_items.battery_item_id::text
    || ':'
    || lower(event.event_type)
from target_items
cross join lateral (
  values
    (
      'COMMISSIONING',
      date_trunc('day', now()) - interval '30 days' + interval '08:00:00',
      '{"note":"Initial commissioning record imported with the operating dataset.","noteZh":"随运行数据集导入的首次投入使用记录。"}'::jsonb,
      'MANUAL_VERIFIED_IMPORT'
    ),
    (
      'INSPECTION',
      date_trunc('day', now()) - interval '1 day' + interval '08:00:00',
      '{"note":"Routine condition inspection record.","noteZh":"例行状态检查记录。"}'::jsonb,
      'SERVICE_SNAPSHOT'
    )
) as event(event_type, event_time, event_data, collection_mode)
on conflict do nothing;

commit;

select
  product.dpp_id,
  item.serial_identifier,
  count(distinct metric.id) as operating_metrics,
  count(distinct event.id) as lifecycle_events,
  max(metric.measured_at) as latest_measurement
from public.products product
join public.battery_item item
  on item.product_id = product.id
left join public.battery_operating_metric metric
  on metric.battery_item_id = item.id
  and metric.data_source = 'INITIAL_DATASET'
left join public.battery_lifecycle_event event
  on event.battery_item_id = item.id
  and event.data_source = 'INITIAL_DATASET'
where item.unique_product_identifier in (
  'https://greanlean.com/p/DPP-LMT-BAT-48V15AH',
  'https://greanlean.com/p/DPP-GV-ESS-14K3-000001'
)
group by product.dpp_id, item.serial_identifier
order by product.dpp_id;
