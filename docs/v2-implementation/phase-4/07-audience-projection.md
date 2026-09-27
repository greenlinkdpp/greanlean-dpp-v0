# Audience projection

`AudienceProjectionService` accepts only an immutable DPP Version plus an audience decision. It never queries Canonical Claims, source records or legacy editing tables.

Audience ranks are:

| Audience | Maximum field classification |
|---|---|
| PUBLIC | PUBLIC |
| LEGITIMATE_INTEREST | LEGITIMATE_INTEREST |
| AUTHORITY | AUTHORITY_ONLY |
| INTERNAL | INTERNAL |

All projections preserve one Passport ID, Version, Schema Version, Payload Hash and publication timestamp. PUBLIC output strips raw source records, internal paths, reviewer identity, service identifiers and restricted evidence. Only public-safe source statements, verification status and public evidence references may be retained.

Anonymous Resolver requests are restricted to `PUBLIC`; requesting a restricted audience returns `PUBLIC_PROJECTION_DENIED`.

