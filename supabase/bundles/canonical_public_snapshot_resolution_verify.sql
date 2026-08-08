with target_ids(dpp_id) as (
  values
    ('DPP-LMT-BAT-48V15AH'),
    ('DPP-GV-ESS-14K3-000001'),
    ('DPP-SFJK-31-1-REC'),
    ('DPP-CE-EARBUDS-001')
),
snapshots as (
  select
    target.dpp_id,
    public.greanlean_public_canonical_dpp_snapshot(target.dpp_id) as snapshot
  from target_ids target
)
select
  (select read_mode from public.dpp_publication_read_control where singleton) =
    'CANONICAL' as canonical_read_mode_passed,
  count(*) filter (where snapshot is not null) = 4
    as four_public_snapshots_passed,
  bool_and(snapshot ->> 'schema' in (
    'https://greanlean.com/schemas/dpp-publication/1.0',
    'greanlean.dpp.publication'
  ))
    as canonical_schema_passed,
  bool_and((snapshot #>> '{publication,version}')::integer >= 1)
    as immutable_version_passed,
  bool_and(not snapshot::text like '%sourceRecord%')
    as no_public_source_record_passed,
  bool_and(not snapshot::text like '%sourceTables%')
    as no_public_source_tables_passed
from snapshots;
