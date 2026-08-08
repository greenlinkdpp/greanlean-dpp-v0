begin;

delete from public.product_versions
where version = 'v2.0'
  and change_type = 'unified_publication'
  and changed_by = 'greanlean migration 0012';

delete from public.product_data_governance
where data_source = 'Published database records and declared product data'
  and data_owner = 'Economic operator'
  and audit_status = 'company_statement_evidence_pending';

delete from public.product_documents
where id in (
  '12800000-0000-4000-8000-000000000001',
  '12800000-0000-4000-8000-000000000002'
);
delete from public.product_digital_identity
where id = '12700000-0000-4000-8000-000000000001';
delete from public.product_consumer_transparency
where id = '12600000-0000-4000-8000-000000000001';
delete from public.product_circularity
where id = '12500000-0000-4000-8000-000000000001';
delete from public.product_traceability
where id in (
  '12400000-0000-4000-8000-000000000001',
  '12400000-0000-4000-8000-000000000002',
  '12400000-0000-4000-8000-000000000003'
);
delete from public.product_certificates
where id in (
  '12300000-0000-4000-8000-000000000001',
  '12300000-0000-4000-8000-000000000002',
  '12300000-0000-4000-8000-000000000003'
);
delete from public.product_esg_metrics
where id = '12200000-0000-4000-8000-000000000001';
delete from public.product_bom
where id in (
  '12100000-0000-4000-8000-000000000001',
  '12100000-0000-4000-8000-000000000002',
  '12100000-0000-4000-8000-000000000003'
);
delete from public.product_materials
where id in (
  '12000000-0000-4000-8000-000000000001',
  '12000000-0000-4000-8000-000000000002',
  '12000000-0000-4000-8000-000000000003'
);

update public.product_documents d
set
  document_name = b.payload->>'document_name',
  document_type = b.payload->>'document_type',
  file_url = b.payload->>'file_url'
from public.greanlean_0012_data_backup b
where b.table_name = 'product_documents' and b.row_id = d.id;

update public.product_consumer_transparency t
set
  brand_story = b.payload->>'brand_story',
  brand_story_zh = b.payload->>'brand_story_zh',
  sustainability_story = b.payload->>'sustainability_story',
  sustainability_story_zh = b.payload->>'sustainability_story_zh'
from public.greanlean_0012_data_backup b
where b.table_name = 'product_consumer_transparency' and b.row_id = t.id;

update public.product_traceability t
set
  facility_name = b.payload->>'facility_name',
  facility_name_zh = b.payload->>'facility_name_zh',
  verification_status = b.payload->>'verification_status',
  notes = b.payload->>'notes',
  notes_zh = b.payload->>'notes_zh'
from public.greanlean_0012_data_backup b
where b.table_name = 'product_traceability' and b.row_id = t.id;

update public.product_esg_metrics e
set
  lca_report_url = b.payload->>'lca_report_url',
  methodology = b.payload->>'methodology',
  verified_by = b.payload->>'verified_by'
from public.greanlean_0012_data_backup b
where b.table_name = 'product_esg_metrics' and b.row_id = e.id;

update public.product_certificates c
set
  certificate_number = b.payload->>'certificate_number',
  issuer = b.payload->>'issuer',
  certificate_url = b.payload->>'certificate_url',
  verification_status = b.payload->>'verification_status'
from public.greanlean_0012_data_backup b
where b.table_name = 'product_certificates' and b.row_id = c.id;

update public.product_digital_identity i
set
  product_uuid = b.payload->>'product_uuid',
  serial_id = b.payload->>'serial_id',
  digital_link_url = b.payload->>'digital_link_url',
  qr_code_id = b.payload->>'qr_code_id'
from public.greanlean_0012_data_backup b
where b.table_name = 'product_digital_identity' and b.row_id = i.id;

update public.products p
set
  dpp_id = b.payload->>'dpp_id',
  public_slug = b.payload->>'public_slug',
  current_version = b.payload->>'current_version',
  unique_product_identifier = b.payload->>'unique_product_identifier',
  description = b.payload->>'description',
  description_zh = b.payload->>'description_zh',
  care_instructions = b.payload->>'care_instructions',
  care_instructions_zh = b.payload->>'care_instructions_zh',
  repair_instructions = b.payload->>'repair_instructions',
  repair_instructions_zh = b.payload->>'repair_instructions_zh',
  end_of_life_instructions = b.payload->>'end_of_life_instructions',
  end_of_life_instructions_zh = b.payload->>'end_of_life_instructions_zh',
  updated_at = (b.payload->>'updated_at')::timestamptz
from public.greanlean_0012_data_backup b
where b.table_name = 'products' and b.row_id = p.id;

drop table if exists public.greanlean_0012_data_backup;
drop table if exists public.dpp_identifier_alias;

commit;
