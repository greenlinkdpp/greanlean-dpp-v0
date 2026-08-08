with checks as (
  select 'P0 foundation tables'::text as check_name, 9::bigint as expected,
    (select count(*) from (values
      (to_regclass('public.dpp_economic_operator_profile')),
      (to_regclass('public.dpp_project')),
      (to_regclass('public.dpp_applicability_assessment')),
      (to_regclass('public.dpp_project_task')),
      (to_regclass('public.dpp_product_ownership')),
      (to_regclass('public.dpp_identifier')),
      (to_regclass('public.dpp_import_job')),
      (to_regclass('public.dpp_import_error')),
      (to_regclass('public.dpp_item_publication_pointer'))
    ) tables(regclass_value) where regclass_value is not null)::bigint as actual
  union all
  select 'P0 tables with RLS', 9,
    (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname in (
        'dpp_economic_operator_profile','dpp_project','dpp_applicability_assessment',
        'dpp_project_task','dpp_product_ownership','dpp_identifier',
        'dpp_import_job','dpp_import_error','dpp_item_publication_pointer'
      ) and c.relrowsecurity)::bigint
  union all
  select 'direct anonymous P0 policies', 0,
    (select count(*) from pg_policies where schemaname = 'public'
      and tablename in ('dpp_project','dpp_identifier','dpp_import_job')
      and 'anon' = any(roles))::bigint
  union all
  select 'battery hierarchy guard triggers', 2,
    (select count(*) from pg_trigger where not tgisinternal
      and tgname in ('battery_batch_p0_hierarchy_guard','battery_item_p0_hierarchy_guard'))::bigint
  union all
  select 'P0 server functions', 9,
    ((to_regprocedure('public.greanlean_p0_bulk_create_battery_items(uuid,uuid,uuid,jsonb,text,uuid)') is not null)::int
      + (to_regprocedure('public.greanlean_p0_is_organisation_member(uuid,uuid)') is not null)::int
      + (to_regprocedure('public.greanlean_p0_save_economic_operator_profile(uuid,jsonb,uuid)') is not null)::int
      + (to_regprocedure('public.greanlean_p0_record_applicability(uuid,uuid,jsonb,jsonb,uuid)') is not null)::int
      + (to_regprocedure('public.greanlean_p0_assign_product_model(uuid,uuid,uuid,uuid)') is not null)::int
      + (to_regprocedure('public.greanlean_p0_create_item_publication_review(uuid,uuid,text,text,text,jsonb,text,text,text,uuid)') is not null)::int
      + (to_regprocedure('public.greanlean_p0_publish_final_item_review(uuid,text,jsonb,text,uuid)') is not null)::int
      + (to_regprocedure('public.greanlean_p0_commit_bom_import(uuid,uuid,uuid,text,jsonb,uuid)') is not null)::int
      + (to_regprocedure('public.greanlean_p0_public_item_snapshot(text)') is not null)::int)::bigint
  union all
  select 'unsafe existing item UPI', 0,
    (select count(*) from public.battery_item
      where unique_product_identifier is not null
        and unique_product_identifier !~ '^https://[^[:space:]]+$')::bigint
  union all
  select 'batch/model product mismatch', 0,
    (select count(*) from public.battery_batch batch
      join public.battery_model_profile model on model.id = batch.battery_model_profile_id
      where batch.product_id <> model.product_id)::bigint
  union all
  select 'item hierarchy mismatch', 0,
    (select count(*) from public.battery_item item
      join public.battery_model_profile model on model.id = item.battery_model_profile_id
      left join public.battery_batch batch on batch.id = item.battery_batch_id
      where item.product_id <> model.product_id
        or (batch.id is not null and (
          batch.product_id <> item.product_id
          or batch.battery_model_profile_id <> item.battery_model_profile_id
        )))::bigint
)
select check_name, expected, actual, actual = expected as passed
from checks
order by check_name;
