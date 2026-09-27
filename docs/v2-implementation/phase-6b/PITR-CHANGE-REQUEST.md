# PITR Decision Record

Status: **DECIDED — NOT REQUIRED FOR INVITED PILOT**

## Decision

```text
PITR_DECISION = NOT_REQUIRED_FOR_PILOT
PITR_ENABLED = NO
RPO_PROPOSED = UP TO 24 HOURS
```

The user explicitly approved managed daily Supabase physical backups as the invited-Pilot database recovery baseline and directed that PITR remain disabled. Seven completed daily physical backups with seven-day retention are visible, and an isolated restore of the latest completed backup passed in 4 minutes 14 seconds.

The proposed RPO is a Pilot-stage objective, not an accepted long-term Production SLA. PITR must be re-evaluated before broader Production rollout if write frequency, customer volume, business criticality, or SLA requirements increase.

This decision did not enable PITR, resize Production, apply V2 migrations, migrate V1 data, switch traffic, enable Registry, activate connectors, modify QR behavior, or enter Phase 7.
