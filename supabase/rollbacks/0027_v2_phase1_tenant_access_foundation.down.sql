begin;

delete from public.greanlean_migration_ledger where migration_number = '0027';

-- Remove policies first because several policies reference other Phase 1 tables.
-- PostgreSQL tracks those cross-table dependencies and will otherwise reject the
-- table drops even though every object is part of this rollback.
drop policy if exists tenant_select on public.tenant;
drop policy if exists tenant_update on public.tenant;
drop policy if exists organisation_v2_select on public.organisation_v2;
drop policy if exists organisation_v2_insert on public.organisation_v2;
drop policy if exists organisation_v2_update on public.organisation_v2;
drop policy if exists tenant_membership_select on public.tenant_membership;
drop policy if exists tenant_membership_write on public.tenant_membership;
drop policy if exists role_select on public.role;
drop policy if exists role_write on public.role;
drop policy if exists capability_select on public.capability;
drop policy if exists role_capability_select on public.role_capability;
drop policy if exists permission_profile_select on public.permission_profile;
drop policy if exists permission_profile_capability_select on public.permission_profile_capability;
drop policy if exists partner_select on public.partner;
drop policy if exists partner_user_link_select on public.partner_user_link;
drop policy if exists partner_authorization_select on public.partner_tenant_authorization;
drop policy if exists partner_authorization_insert on public.partner_tenant_authorization;
drop policy if exists partner_authorization_update on public.partner_tenant_authorization;
drop policy if exists scope_grant_select on public.scope_grant;
drop policy if exists scope_grant_write on public.scope_grant;
drop policy if exists policy_decision_audit_select on public.policy_decision_audit;
drop policy if exists legacy_entity_mapping_select on public.legacy_entity_mapping;
drop policy if exists legacy_entity_mapping_write on public.legacy_entity_mapping;

drop table if exists public.v2_idempotency_record;
drop table if exists public.legacy_entity_mapping;
drop table if exists public.policy_decision_audit;
drop table if exists public.scope_grant;
drop table if exists public.partner_tenant_authorization;
drop table if exists public.partner_user_link;
drop table if exists public.tenant_membership;
drop table if exists public.permission_profile_capability;
drop table if exists public.role_capability;
drop table if exists public.role;
drop table if exists public.permission_profile;
drop table if exists public.capability;
drop table if exists public.partner;
drop table if exists public.organisation_v2;
drop table if exists public.tenant;

drop function if exists public.v2_policy_allows(uuid, text);
drop function if exists public.v2_user_has_partner_resource_capability(uuid, text, text, uuid, text);
drop function if exists public.v2_user_has_partner_capability(uuid, text);
drop function if exists public.v2_user_has_capability(uuid, text);
drop function if exists public.v2_seed_tenant_roles();
drop function if exists public.v2_validate_scope_grant();
drop function if exists public.v2_reject_audit_mutation();
drop function if exists public.v2_reject_tenant_change();
drop function if exists public.v2_touch_updated_at();

commit;
