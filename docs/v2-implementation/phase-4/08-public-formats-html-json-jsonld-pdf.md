# Public formats: HTML, JSON, JSON-LD and PDF

Every format is generated from the same `dpp_version.canonical_payload` and the same PUBLIC projection.

- JSON returns Passport, Version, Schema, hash, subject and projected fields.
- HTML renders the projection and embeds Passport ID, Version and Payload Hash as data attributes.
- JSON-LD uses only stored semantic URIs. Its controlled context version is `greanlean-dpp-internal-2026-09-v1` and it declares `PARTIAL_INTERNAL_PROFILE`; it is not represented as an official EU context.
- PDF includes Passport ID, identifier, Version, Payload Hash, Schema Version, published time and generated time.

All responses carry `X-DPP-Passport-ID`, `X-DPP-Version`, `X-DPP-Payload-Hash`, `X-DPP-Schema-Version`, and `X-DPP-Published-At`. ETag combines Payload Hash, projection version and audience.

