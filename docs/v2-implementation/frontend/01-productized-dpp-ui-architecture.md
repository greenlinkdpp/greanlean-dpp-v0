# Productized V2 DPP UI Architecture

## Result

```text
PRODUCTIZED_DPP_UI = PASS
ENVIRONMENT = HOSTED_PREPRODUCTION_ONLY
MIGRATION_HEAD = 0035
```

The page remains a presentation layer over one resolved immutable Passport version:

```text
Stable DPP identifier
→ Resolver and Current Pointer
→ Published immutable payload
→ Server-side audience projection
→ Presentation metadata adapter
→ Section and field renderers
→ Responsive product passport
```

The UI does not query canonical Claims, BMS tables, documents or product hierarchy separately. It receives one resolved payload and therefore cannot become a second business-data system or create a client-side waterfall.

## Layer boundaries

| Layer | Responsibility | Explicit non-responsibility |
|---|---|---|
| Resolver | Resolve stable identity to the current immutable version | UI layout |
| Audience projection | Remove fields above the authorized audience | CSS hiding |
| Adapter | Normalize identity, metrics, sections and business states | Change canonical meaning |
| Presentation metadata | Select section, label, renderer, order and priority | Store business values |
| Section renderer | Omit empty sections and compose cards | Fetch extra business data |
| Field renderer | Render known and future scalar/list/object values safely | Assume a SOODOO-specific schema |

The battery profile is implemented with field-code metadata. Unknown future fields use a safe technical key/value fallback without breaking the page. New product categories can supply alternative metadata and ordering while retaining the core adapter and renderers.

## Security boundary

Public pages always call `projectImmutableDpp(..., "PUBLIC")` unless the server validates a short-lived PreProd audience grant. A bare `?audience=MANUFACTURER` parameter is ignored. Grants are HMAC signed server-side, bound to Passport identifier, audience and expiry, limited to one hour in the UI, valid only on `greanlean-dpp-preprod.vercel.app`, and unavailable in Production.

No internal projection is embedded in public HTML or hydration data. External document actions accept HTTPS URLs only. Values are rendered as React text rather than injected HTML.

## Compatibility

The implementation does not change Resolver, JSON, JSON-LD, HTML, PDF, QR, aliases, Current Pointer, immutable version or tombstone contracts. PreProd remains non-indexed through page metadata. Production deployment, traffic switching, Registry submission, connector activation and Phase 8 remain out of scope.
