begin;

drop trigger if exists schema_version_immutable_when_published on public.schema_version;
drop trigger if exists codelist_value_immutable_when_published on public.codelist_value;
drop trigger if exists codelist_immutable_when_published on public.codelist;
drop trigger if exists codelist_touch_updated_at on public.codelist;
drop trigger if exists regulatory_reference_touch_updated_at on public.regulatory_reference;
drop trigger if exists schema_definition_touch_updated_at on public.schema_definition;

drop table if exists public.codelist_value;
drop table if exists public.codelist;
drop table if exists public.regulatory_reference;
drop table if exists public.schema_version;
drop table if exists public.schema_definition;
drop table if exists public.access_level;

drop function if exists public.greanlean_protect_schema_version();
drop function if exists public.greanlean_protect_codelist_value();
drop function if exists public.greanlean_protect_codelist();
drop function if exists public.greanlean_touch_updated_at();

commit;
