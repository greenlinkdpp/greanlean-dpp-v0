# Resolver Query Analysis

## EXPLAIN ANALYZE result

| Operation | Plan | Execution |
|---|---|---:|
| Host allowlist | Index Scan | 1.003 ms |
| Path mapping | Index Scan | 1.387 ms |
| Identifier lookup | Index Scan/filter | 0.113 ms |
| Identifier mapping | Nested Loop | 0.739 ms |
| Passport | Index Scan | 1.359 ms |
| Pointer + immutable version | Nested Loop/indexes | 2.740 ms |

PreProd contains only 13 identifiers, 21 mappings, 4 Passports, 2 current pointers and 6 versions. Existing primary, mapping, current-pointer and version indexes were used. A focused partial index on active `normalized_value` was prepared for the accepted upper bound of 5,000 Passports.

## Query count

```text
Before: 6 normal database HTTP round trips
Before with identifier mapping: 7
Before alias chain: +1 per hop
Before withdrawn fallback: +1
After: 1 database RPC round trip
Duplicate query count after: 0
```

## Root cause

```text
PRIMARY_ROOT_CAUSE = NETWORK_ROUND_TRIP
SECONDARY_ROOT_CAUSE = OTHER_EVIDENCED_MULTI_ROUND_TRIP
DATABASE_QUERY = NOT_PRIMARY
PROJECTION_RECOMPUTE = NOT_PRESENT
SERIALIZATION = NOT_PRIMARY
PAYLOAD_SIZE = NOT_PRIMARY
CONCURRENCY_SATURATION = NOT_EVIDENCED
```

The SQL work was sub-3 ms, but every Supabase HTTP call commonly cost hundreds of milliseconds. Sequential orchestration multiplied transport/connection latency. Nano compute resize is not evidence-supported as the primary remedy.
