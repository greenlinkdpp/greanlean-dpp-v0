# QR Policy Decision

```text
QR_POLICY_DECISION = DEPRECATED
ARBITRARY_TARGET_QR = DEPRECATED
```

The official QR endpoint no longer accepts an unrestricted user destination. It validates both the legacy `data` parameter and compatibility `url` parameter against one policy:

- HTTPS only, except localhost in local development.
- Current GreanLean request host or explicitly configured approved host only.
- Exact official paths only: `/api/v2/resolver/{id}`, `/p/{id}`, or `/01/{id}`.
- No query, fragment, embedded credentials, private/custom host unless explicitly configured, `file:`, or `javascript:` target.

Hosted PreProd accepts its official Resolver URL and rejects an external HTTPS host and a `javascript:` target with 400. The existing legacy alias resolves through the approved hosted Resolver mapping. Production was not redeployed or changed, so existing Production QR behaviour is unchanged.
