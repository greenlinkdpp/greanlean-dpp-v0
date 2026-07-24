-- Removes only the GreenVault synthetic demo. Existing LMT and legacy demos are untouched.
begin;

delete from public.products
where dpp_id = 'DPP-GV-ESS-14K3-000001';

delete from public.battery_metric_type
where code in (
  'FULL_CHARGE_CAPACITY_DEMO',
  'FULL_EQUIVALENT_CYCLES_DEMO',
  'CURRENT_INTERNAL_RESISTANCE_DEMO'
)
and not exists (
  select 1
  from public.battery_operating_metric metric
  where metric.metric_type = public.battery_metric_type.code
);

commit;
