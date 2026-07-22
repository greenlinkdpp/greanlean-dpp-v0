# Deployment And Rollback

## Release Gate

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run test:migrations
npm run build
```

Deploy the branch to a Vercel preview connected to a non-production database.
Run `BASE_URL=<preview-url> npm run test:smoke` and manually verify Chinese and
English public DPP pages, audience-specific views, QR rendering, and JSON export.

## Production

Production requires an approved migration record, backup confirmation, preview
evidence, a named release owner, and a rollback owner. Enable new feature flags
separately after application deployment.

## Rollback Order

1. Disable the new feature flag.
2. Restore the previous Vercel application release.
3. Stop new writes to additive tables.
4. Run a down migration only if no business data has been stored there.
5. Prefer a forward repair when data already exists.

Phase 3 does not deploy or alter the production database.
