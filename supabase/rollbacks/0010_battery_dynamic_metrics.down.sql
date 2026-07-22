begin;

drop trigger if exists battery_operating_metric_append_only on public.battery_operating_metric;
drop view if exists public.battery_operating_metric_latest;
drop table if exists public.battery_operating_metric;
drop table if exists public.battery_metric_type;

commit;
