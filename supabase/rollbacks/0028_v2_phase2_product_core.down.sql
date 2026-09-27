begin;

delete from public.greanlean_migration_ledger where migration_number = '0028';

drop policy if exists product_identifier_update on public.product_subject_identifier;
drop policy if exists product_identifier_insert on public.product_subject_identifier;
drop policy if exists product_identifier_select on public.product_subject_identifier;
drop policy if exists product_item_update on public.product_item;
drop policy if exists product_item_insert on public.product_item;
drop policy if exists product_item_select on public.product_item;
drop policy if exists batch_sku_link_update on public.batch_sku_link;
drop policy if exists batch_sku_link_insert on public.batch_sku_link;
drop policy if exists batch_sku_link_select on public.batch_sku_link;
drop policy if exists product_batch_update on public.product_batch;
drop policy if exists product_batch_insert on public.product_batch;
drop policy if exists product_batch_select on public.product_batch;
drop policy if exists sku_update on public.sku;
drop policy if exists sku_insert on public.sku;
drop policy if exists sku_select on public.sku;
drop policy if exists product_model_update on public.product_model;
drop policy if exists product_model_insert on public.product_model;
drop policy if exists product_model_select on public.product_model;
drop policy if exists product_family_update on public.product_family;
drop policy if exists product_family_insert on public.product_family;
drop policy if exists product_family_select on public.product_family;

drop table if exists public.product_subject_identifier;
drop table if exists public.product_item;
drop table if exists public.batch_sku_link;
drop table if exists public.product_batch;
drop table if exists public.sku;
drop table if exists public.product_model;
drop table if exists public.product_family;

drop function if exists public.v2_validate_item_batch_sku_link();
drop function if exists public.v2_validate_product_identifier_subject();
drop function if exists public.v2_prepare_product_identifier();
drop function if exists public.v2_normalize_product_identifier(text, text);
drop function if exists public.v2_gtin_is_valid(text);

commit;
