# Round G4.2 deterministic cutover dry-run

The fixed UUIDv5 target map and complete Production cutover SQL were executed
inside one Production transaction and ended with `ROLLBACK`.

- Production namespace: `c8d1c20a-f166-5bcf-b199-d7dba9092c9b`
- Mapped source rows: 145
- Deterministic ID collisions: 0
- Resolver rows promoted in the simulated state: 8
- Simulated final inventory: 0 Legacy DPPs and 8 approved Demo DPPs
- Post-rollback inventory: 22 Legacy DPPs and 0 approved Demo DPPs
- Auth users after rollback: 5
- Tenants after rollback: 2

The COMMIT sibling is operation-equivalent to the dry-run SQL; only the final
transaction terminator differs.
