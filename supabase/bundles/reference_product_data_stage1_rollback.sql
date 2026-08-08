-- This rollback restores only the labels that were present immediately before
-- the Stage 1 normalisation. It intentionally does not delete battery values.

begin;

update public.products
set brand = 'GREANLEAN TEST DATA', updated_at = now()
where dpp_id = 'DPP-LMT-BAT-48V15AH';

update public.products
set brand = 'GreenVault Demo', updated_at = now()
where dpp_id = 'DPP-GV-ESS-14K3-000001';

update public.battery_model_profile
set
  economic_operator_name = 'Greanlean DPP Test Operator',
  manufacturer_name = 'Greanlean Demonstration Battery Manufacturing',
  manufacturing_place = 'Test manufacturing site, Shenzhen, Guangdong, China',
  source_type = 'synthetic_test',
  verification_status = 'unverified',
  updated_at = now()
where product_id = (
  select id from public.products where dpp_id = 'DPP-LMT-BAT-48V15AH'
);

commit;
