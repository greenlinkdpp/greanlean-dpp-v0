begin;

-- Logical rollback: restore the original short-identifier gate.
create or replace function public.greanlean_project_canonical_snapshot(
  source_snapshot jsonb,
  requested_level text
)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  normalized_level text := upper(coalesce(requested_level, 'PUBLIC'));
  projected_snapshot jsonb := source_snapshot;
  projected_modules jsonb := '{}'::jsonb;
  projected_module jsonb;
  projected_records jsonb;
  projected_record jsonb;
  module_key text;
  module_value jsonb;
  record_value jsonb;
  evidence_value jsonb;
  projected_evidence jsonb := '[]'::jsonb;
begin
  if source_snapshot is null
    or source_snapshot ->> 'schema' is distinct from 'greanlean.dpp.publication'
  then
    return null;
  end if;
  if normalized_level not in (
    'PUBLIC',
    'LEGITIMATE_INTEREST',
    'AUTHORITY_ONLY',
    'INTERNAL'
  ) then
    raise exception 'INVALID_CANONICAL_PROJECTION_LEVEL' using errcode = '22023';
  end if;

  for module_key, module_value in
    select key, value
    from jsonb_each(coalesce(source_snapshot -> 'modules', '{}'::jsonb))
  loop
    projected_records := '[]'::jsonb;
    for record_value in
      select value
      from jsonb_array_elements(coalesce(module_value -> 'records', '[]'::jsonb))
    loop
      if public.greanlean_access_rank(normalized_level)
        < public.greanlean_access_rank(coalesce(record_value ->> 'accessLevel', 'PUBLIC'))
      then
        continue;
      end if;
      projected_record := jsonb_set(
        record_value,
        '{fields}',
        public.greanlean_project_canonical_field_array(
          record_value -> 'fields',
          normalized_level
        ),
        true
      );
      if jsonb_array_length(projected_record -> 'fields') > 0 then
        projected_records := projected_records || jsonb_build_array(projected_record);
      end if;
    end loop;

    projected_module := jsonb_set(
      jsonb_set(
        module_value,
        '{fields}',
        public.greanlean_project_canonical_field_array(
          module_value -> 'fields',
          normalized_level
        ),
        true
      ),
      '{records}',
      projected_records,
      true
    );
    projected_modules := projected_modules || jsonb_build_object(
      module_key,
      projected_module
    );
  end loop;

  for evidence_value in
    select value
    from jsonb_array_elements(coalesce(source_snapshot -> 'evidenceIndex', '[]'::jsonb))
  loop
    if public.greanlean_access_rank(normalized_level)
      < public.greanlean_access_rank(coalesce(evidence_value ->> 'accessLevel', 'PUBLIC'))
    then
      continue;
    end if;
    projected_evidence := projected_evidence || jsonb_build_array(
      case
        when public.greanlean_access_rank(normalized_level) < 2
          then evidence_value - 'sourceRecord'
        else evidence_value
      end
    );
  end loop;

  projected_snapshot := jsonb_set(
    projected_snapshot,
    '{modules}',
    projected_modules,
    true
  );
  projected_snapshot := jsonb_set(
    projected_snapshot,
    '{evidenceIndex}',
    projected_evidence,
    true
  );
  projected_snapshot := jsonb_set(
    projected_snapshot,
    '{audienceManifest}',
    jsonb_build_object(
      normalized_level,
      coalesce(
        source_snapshot #> array['audienceManifest', normalized_level],
        '{}'::jsonb
      )
    ),
    true
  );

  if public.greanlean_access_rank(normalized_level) < 3 then
    projected_snapshot := jsonb_set(
      projected_snapshot,
      '{governance}',
      (coalesce(projected_snapshot -> 'governance', '{}'::jsonb) - 'generatedBy')
        || jsonb_build_object('generatedBy', null, 'sourceTables', '[]'::jsonb),
      true
    );
  end if;
  return projected_snapshot;
end;
$$;

commit;
