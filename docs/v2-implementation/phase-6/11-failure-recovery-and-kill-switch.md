# Failure recovery and kill switch

## Implemented kill switches

| Switch | Protected surface | Default | Contract result |
|---|---|---|---|
| `FEATURE_V2_PUBLIC_READ` | Anonymous V2 Resolver/public read | false | PASS |
| `FEATURE_V2_TENANT_API` | Authenticated V2 API base gate | false | PASS |
| `FEATURE_V2_PUBLICATION_WRITE` | Publication/review mutations | false | PASS |
| `FEATURE_V2_CONNECTOR_EXECUTION` | Connector jobs, test, webhook, Registry polling | false | PASS |

The switches are server-side, independent, fail closed, and are not authorization. Development enables them explicitly; `.env.example` defaults them off. Three Phase 6 unit tests passed. A live Pre-Production disable/enable drill was not possible, so `ROLLBACK_GATE = BLOCKED` despite the implementation PASS.

## Failure evidence

| Scenario | Existing evidence | Pre-Production injection | Status |
|---|---|---|---|
| Registry TEST rejection/timeout | Unit/integration contracts keep public DPP independent | Development clean rerun PASS for accepted/rejected/timeout/poll | PARTIAL — not PreProd |
| Connector timeout/SSRF | Timeout bounds, retry classification, SSRF tests | Not injected in PreProd | PARTIAL |
| Webhook forgery/replay | HMAC/timestamp tests and Development replay/idempotency PASS | Burst not tested | PARTIAL |
| Invalid secret reference | Reference-only model and redaction tests | Not injected | PARTIAL |
| Storage failure | Published payload designed independent of evidence download | Not injected | BLOCKED |
| DB unavailable | Error wrapper/correlation IDs exist | Not injected | BLOCKED |
| Migration failure/rollback | Every migration has a rollback; 50 contracts pass | Clean DB apply/fail/rollback not executed | BLOCKED |
| Resolver stale cache | ETag/cache controls exist | Not injected | BLOCKED |

## Historical seed-trigger issue

Root cause: the shared legacy trigger referenced `NEW.battery_batch_id` for `battery_item`, where that column does not exist. Migration `0032` replaces only the item trigger function with `to_jsonb(NEW)->>'battery_batch_id'`, preserving trigger bindings and legacy tables. Its rollback restores the prior function.

Development evidence: migration `0032` is recorded, the complete historical V1 reference seed replayed successfully, and the known fixture exists. Contract tests: 2/2 PASS. The historical issue is closed in Development; Production was not changed.

## Recovery order

1. Disable the smallest affected switch.
2. Restore V1 read/write authority; do not drop V2 data.
3. Stop connector/Registry execution before public read unless the public path is itself unsafe.
4. Preserve audits, receipts, versions, and failed migration evidence.
5. Reconcile writes made after the cutover checkpoint.
6. Re-enable only after owner approval and smoke/negative tests.
