# 03 Production RLS Verification

## Overall result

**RLS correctness: NOT VERIFIED.** Anonymous runtime responses show some public filtering and explicit privilege denials, but the Production `pg_class`, `pg_policy`, grants, policy expressions, roles, and function execution privileges were not available.

## Anonymous observations

| Surface | Observation | What it proves | What it does not prove |
|---|---|---|---|
| `dpp_product_ownership` | HTTP 401 permission denied | anon lacks direct table SELECT | authenticated isolation, service-role use, policy expression |
| publication/pointer/review/validation tables | HTTP 401 permission denied | anon lacks table SELECT | immutable trigger, admin scope, authenticated access |
| `dpp_organisation` | HTTP 200, zero public-visible rows | anon query returns no rows in sample | RLS enabled, tenant isolation |
| Schema tables | HTTP 200 with published rows visible | public catalogue projection exists | draft protection for authenticated users |
| battery model | two public-visible rows | some battery data is intentionally public | sensitive field exclusion across all policies |
| batch/item/operating metric | zero public-visible rows | no public rows in sample | whether hidden rows exist or tenant RLS is correct |
| file/lifecycle tables | zero public-visible rows | no public rows in sample | object/path isolation and authenticated policy correctness |

## Repository-expected policy areas

The checked-in migrations enable RLS and define policies for Schema Registry, battery domain, identity/access, publication, files, lifecycle, Registry adapter, and P0 hierarchy. These are **REPOSITORY EXPECTED**, not Production proof.

| Area | Expected control | Production policy definition |
|---|---|---|
| Organisation/membership | authenticated membership and platform controls | NOT VERIFIED |
| Product ownership/grants | organisation + product scope | NOT VERIFIED |
| Battery hierarchy | organisation-scoped membership and product editor scope | NOT VERIFIED |
| Publication | no direct anon/auth table access; RPC projection | partial privilege denial observed; expressions NOT VERIFIED |
| Files | public only at public level; authenticated via access rank | NOT VERIFIED |
| Lifecycle | public/auth projection by access class | NOT VERIFIED |
| Registry | platform/service operations | NOT VERIFIED |
| Audit | append-only/server-only | NOT VERIFIED |
| Storage objects | private bucket/path policies | NOT VERIFIED |

## Required policy export format

For every Production business table, the follow-up read-only export must include:

```text
table
row_security enabled/forced
policy name
command
roles
USING expression
WITH CHECK expression
owner and table grants
```

Special attention is required for functions with `SECURITY DEFINER`; RLS can be bypassed by function ownership even when table policies look correct.

## Cross-tenant negative tests

| Test | Production execution | Result |
|---|---|---|
| Tenant A user → Tenant B product | NOT EXECUTED IN PRODUCTION | no approved read-only test account |
| Partner user → unbound Tenant | NOT EXECUTED IN PRODUCTION | partner binding does not yet exist as a first-class model |
| Anonymous → restricted field | public page/table sampling only | no restricted-field fixture was read |
| Authenticated member → unrelated file | NOT EXECUTED IN PRODUCTION | file endpoint writes an access-audit record and was therefore not called |

No Production login, user creation, session mutation, file download, or audit-producing endpoint was invoked.

## Findings

1. Direct anon denial on publication and ownership tables is a useful guardrail but not a tenant-isolation proof.
2. Public Schema and battery rows are intentionally exposed; exact field classifications must be checked against Production policies.
3. The public file download path performs an audit insert before returning a signed URL. Testing it would not be strictly read-only and was intentionally skipped.
4. Current partner access is role/product-grant based; an explicit Partner–Tenant authorization boundary is absent.
5. Platform administrator and service-role bypass scope cannot be assessed without grants and function-owner metadata.

## Blocking evidence

Before V2 code touches tenant-scoped data, provide:

- Production policy export and table grants;
- authenticated negative-test accounts in staging;
- a staging test proving Tenant A/Tenant B denial at REST, RPC, and storage layers;
- explicit documentation of service-role call sites and server-only enforcement;
- confirmation that all security-definer functions set a safe search path.

**RLS baseline status: BLOCKED / NOT VERIFIED.**
