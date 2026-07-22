begin;

drop trigger if exists access_policy_immutable_when_published on public.access_policy;
drop trigger if exists field_regulatory_reference_immutable_when_published on public.field_regulatory_reference;
drop trigger if exists applicability_rule_immutable_when_published on public.applicability_rule;
drop trigger if exists validation_rule_immutable_when_published on public.validation_rule;
drop trigger if exists field_definition_immutable_when_published on public.field_definition;
drop trigger if exists access_policy_touch_updated_at on public.access_policy;
drop trigger if exists applicability_rule_touch_updated_at on public.applicability_rule;
drop trigger if exists validation_rule_touch_updated_at on public.validation_rule;
drop trigger if exists field_definition_touch_updated_at on public.field_definition;

drop table if exists public.access_policy;
drop table if exists public.field_regulatory_reference;
drop table if exists public.applicability_rule;
drop table if exists public.validation_rule;
drop table if exists public.field_definition;

drop function if exists public.greanlean_protect_published_schema_child();

commit;
