begin;

drop trigger if exists registry_proof_append_only on public.registry_registration_proof;
drop trigger if exists registry_error_append_only on public.registry_error_log;
drop trigger if exists registry_validation_append_only on public.registry_validation_result;
drop trigger if exists registry_submission_chain_guard on public.registry_submission;
drop table if exists public.registry_registration_proof;
drop table if exists public.registry_error_log;
drop table if exists public.registry_validation_result;
drop table if exists public.registry_submission;
drop table if exists public.registry_organisation_enrolment;
drop table if exists public.registry_mapping;
drop function if exists public.greanlean_prevent_registry_evidence_mutation();
drop function if exists public.greanlean_validate_registry_submission_chain();

commit;
