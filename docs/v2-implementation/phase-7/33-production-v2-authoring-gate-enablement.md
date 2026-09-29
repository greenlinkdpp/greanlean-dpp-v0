# Phase 7 — Production V2 Authoring Gate Enablement

Generated: `2026-09-28`

## Result

```text
PRODUCTION_V2_AUTHORING_GATE_ENABLEMENT = PASS
FEATURE_GATE_SEPARATION = PASS
CODE_CHANGE_PERFORMED = NO
DEPLOYED_RC_MATCH = TRUE
PUBLIC_PRIMARY_FLAGS_CHANGED = NO
```

The exact RC `b4412f0a32f0e91c3b16f6bc7017f8ee7a9de773` / tree `166c65c46bdadf9ba4a31759dfd21a2d22d2c1f7` was redeployed after adding only the server-side flags required by the confirmed-write and authenticated Backoffice paths. No source, migration, database schema, public-routing, Registry, connector-execution, or passwordless-login change was made.

## Gate matrix

All policy-protected routes also require the base set `FEATURE_SERVER_API_V2`, `FEATURE_V2_TENANT_API`, `FEATURE_V2_TENANT_CORE`, and `FEATURE_V2_ACCESS_POLICY`.

| Endpoint | Additional source gates | Effect |
| --- | --- | --- |
| Mapping dry-run | `FEATURE_V2_SCHEMA_CORE`, `FEATURE_V2_CANONICAL_DATA` | authenticated authoring only |
| Mapping commit | dry-run set plus `FEATURE_V2_PROVENANCE` | authenticated authoring only |
| Passport create | `FEATURE_V2_DPP_PASSPORT`, `FEATURE_V2_PRODUCT_CORE`, `FEATURE_V2_SCHEMA_CORE`, `FEATURE_V2_PUBLICATION_WRITE` | authenticated authoring only |
| Review submit | Passport/Product/Schema plus `FEATURE_V2_DPP_REVIEW`, Canonical, Provenance, `FEATURE_V2_RESOLUTION_ENGINE`, Publication Write | authenticated authoring only |
| Review approve | `FEATURE_V2_DPP_REVIEW`, `FEATURE_V2_PUBLICATION_WRITE` | authenticated authoring only |
| Publication | `FEATURE_V2_DPP_PUBLICATION`, Review, Passport, Product, Canonical, Provenance, Resolution, Publication Write | authenticated publication only |
| Resolver mapping administration | `FEATURE_V2_RESOLVER`, Passport, Product, Publication Write | authenticated administration only |
| Backoffice context | authentication boundary; no feature switch | authenticated context only |
| Backoffice snapshot | Partner, Product, Schema, Canonical, Provenance, Passport, Review, Publication, `FEATURE_V2_INTEGRATION_CORE` | authenticated Backoffice only |

## Production environment delta

The following non-secret Production configuration names were added with value `true`:

```text
FEATURE_SERVER_API_V2
FEATURE_V2_TENANT_API
FEATURE_V2_TENANT_CORE
FEATURE_V2_ACCESS_POLICY
FEATURE_V2_PRODUCT_CORE
FEATURE_V2_SCHEMA_CORE
FEATURE_V2_CANONICAL_DATA
FEATURE_V2_PROVENANCE
FEATURE_V2_RESOLUTION_ENGINE
FEATURE_V2_DPP_PASSPORT
FEATURE_V2_DPP_REVIEW
FEATURE_V2_DPP_PUBLICATION
FEATURE_V2_RESOLVER
FEATURE_V2_PUBLICATION_WRITE
FEATURE_V2_PARTNER
FEATURE_V2_INTEGRATION_CORE
```

The following public or external execution gates remained absent/off:

```text
FEATURE_V2_PUBLIC_READ
FEATURE_V2_PUBLIC_PROJECTION
FEATURE_V2_REGISTRY_TEST
FEATURE_V2_EXTERNAL_CONNECTORS
FEATURE_V2_CONNECTOR_EXECUTION
FEATURE_V2_FILE_IMPORT
FEATURE_V2_BMS_ADAPTER
```

Because `/p` requires Resolver plus Public Projection and the public Resolver API additionally requires Public Read, Passport, Publication, Resolver, and Public Projection, the authoring set cannot cut public traffic to V2. A live unauthenticated Mapping Dry Run changed from `404 V2_FEATURE_DISABLED` to the correct `401 AUTH_REQUIRED`, while the public Reference Resolver remained `404 V2_FEATURE_DISABLED`.

## Deployment and regression

| Field | Value |
| --- | --- |
| Previous deployment | `dpl_E6SqW2kKTseE1jYajt5k6uutE56p` |
| New deployment | `dpl_6poWp5p95At2hq4jbUAn1hZkQo3y` |
| Immutable URL | `https://greanlean-dpp-v0-ljivv75pj-songweinie-1175s-projects.vercel.app` |
| State | READY / Production / `www.greanlean.com` |
| Migration head | `0035` |

Homepage, representative V1 DPP, representative V1 API, login, Auth, Storage, CSP nonce/hydration and unauthenticated Backoffice protection passed after redeployment. V1 business counts remained unchanged.

```text
V1_AFTER_AUTHORING_GATE_ENABLEMENT = PASS
V2_AUTHORING_API_GATE = OPEN_FOR_AUTHORIZED_TENANT
GLOBAL_V2_PRIMARY = FALSE
REFERENCE_TENANT_V2_PRIMARY = FALSE
SOODOO_V2_PRIMARY = FALSE
OTHER_TENANT_V2_PRIMARY = FALSE
```
