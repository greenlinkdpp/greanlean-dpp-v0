# Pilot SLO and Capacity

## Proposed invited-Pilot envelope

The user authorised a single invited Pilot but did not accept numeric workload or latency values. The following is therefore a measured proposal, not an accepted SLA.

| Dimension | Proposed value / basis |
|---|---|
| Tenant count | 1 invited tenant |
| Controlled users | Small invited group; exact count requires owner confirmation |
| Product/model count | 1 model in the cutover scope |
| Passport count | 1 published Passport at cutover |
| Expected normal concurrency | 2 concurrent public requests |
| Expected burst concurrency | 10 concurrent public requests |
| Expected Resolver rate | Up to 60 requests/minute under normal Pilot use; hard technical route ceiling is 120/minute/client identity |
| Proposed warm p95 | <= 2,500 ms across each required public path |
| Proposed error rate | <= 1% over a rolling 15-minute window, excluding intentional 4xx responses |
| Safety margin | Measured p95 must be <= 2,000 ms (20% below the proposed 2,500 ms ceiling) under the burst profile |
| Observation window | 15-minute operational alert window plus pre-cutover hosted load sample |

The numbers above are deliberately limited to the invited Pilot and are not an Enterprise-scale claim. They require business/operational acceptance before becoming a Pilot SLO.

## Decision

The hosted functional workload returned no application errors, but the measured 10-way burst exceeded both the proposed p95 and its safety-margin threshold. In addition, the numeric envelope is not owner-accepted.

```text
DEFINED_PILOT_SLO = PROPOSED_NOT_ACCEPTED
PILOT_CAPACITY = BLOCKED
```
