-- Fill GTIN / SGTIN source fields for DPP-UNXPBA91.
-- SGTIN is rendered by the app as: gtin || '.' || serial_id

begin;

create temporary table if not exists _unxpba91_target_product as
  select id
  from public.products
  where dpp_id = 'DPP-UNXPBA91' or sku = 'TEXTILE-VEST-002'
  limit 1;

update public.product_digital_identity di
set
  product_uuid = 'DPP-UNXPBA91',
  gtin = '06900000000427',
  style_id = coalesce(nullif(btrim(di.style_id), ''), 'TEXTILE-VEST-002'),
  batch_id = coalesce(nullif(btrim(di.batch_id), ''), 'TEXTILE-BATCH-2026-002'),
  serial_id = 'UNXPBA91',
  digital_link_url = 'https://www.greanlean.com/p/DPP-UNXPBA91',
  qr_code_id = coalesce(nullif(btrim(di.qr_code_id), ''), 'QR-DPP-UNXPBA91')
from _unxpba91_target_product t
where di.product_id = t.id;

insert into public.product_digital_identity (
  product_id,
  product_uuid,
  gtin,
  style_id,
  batch_id,
  serial_id,
  digital_link_url,
  qr_code_id
)
select
  t.id,
  'DPP-UNXPBA91',
  '06900000000427',
  'TEXTILE-VEST-002',
  'TEXTILE-BATCH-2026-002',
  'UNXPBA91',
  'https://www.greanlean.com/p/DPP-UNXPBA91',
  'QR-DPP-UNXPBA91'
from _unxpba91_target_product t
where not exists (
  select 1 from public.product_digital_identity di where di.product_id = t.id
);

update public.products p
set updated_at = now()
from _unxpba91_target_product t
where p.id = t.id;

select
  p.dpp_id,
  p.sku,
  di.gtin,
  di.serial_id,
  di.gtin || '.' || di.serial_id as sgtin
from public.products p
join public.product_digital_identity di on di.product_id = p.id
where p.id in (select id from _unxpba91_target_product);

drop table if exists _unxpba91_target_product;

commit;
