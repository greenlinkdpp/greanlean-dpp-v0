# QR and legacy URL compatibility

QR output is generated only after the requested origin matches `resolver_host_allowlist`. The encoded value is the V2 Resolver URL; arbitrary URL input is not accepted. Existing Production QR codes are not changed.

Development compatibility is explicit through Resolver Mapping rows for DPP ID, GTIN, UPI, legacy DPP ID, public slug, alias, named product path, `/01/{gtin}` and old URL. The `/p/{identifier}` server page checks V2 first. If a V2-primary Passport exists but resolution fails, it returns not found and does not read live V1 data. Otherwise existing V1 pages retain their current behavior.

