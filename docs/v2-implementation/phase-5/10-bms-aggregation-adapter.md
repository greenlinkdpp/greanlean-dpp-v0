# BMS Aggregation Adapter

The BMS adapter validates tenant/item/device binding and rejects duplicate or stale events. It reduces a bounded sample window into a snapshot containing count, latest, minimum, maximum and average values plus threshold events.

High-frequency samples are not stored as DPP fields and are not written one-by-one as Canonical Claims. `bms_aggregation_snapshot` stores only the aggregate window, source fingerprint and rule outcome.

A Canonical Claim candidate is created only when an explicit aggregation rule is enabled and names the target Field Definition and Schema Version. Provenance links the Claim to the BMS Data Source and aggregate snapshot. This preserves the Phase 3 canonical boundary and Phase 4 publication workflow.

Development evidence aggregated two synthetic samples, verified device binding and replay rejection, persisted a snapshot, and generated the rule-gated Claim path.
