# Import and Mapping Workflow

The import workspace accepts CSV, JSON and Excel (`.xlsx`/`.xls`) selections. CSV and JSON are previewed as text. Excel workbooks are read locally in the browser; the first worksheet is normalized to escaped CSV so the existing controlled Phase 5 import protocol and database format remain unchanged.

The operator sequence is:

1. Choose a Tenant-authorised file and inspect its preview.
2. Select/use the Tenant's configured Connector and active Mapping Version.
3. Run `PREFLIGHT`. This creates reconciliation evidence but does not commit Canonical Claims.
4. Inspect new/unchanged/changed/conflict/rejected counts, unmapped fields and errors.
5. Revise the Mapping Profile/Version when required. Mapping versions remain immutable after activation.
6. Only a user with `import.commit` may explicitly commit through the existing API.

The console never silently commits after preview. File content is bounded by the existing request/capacity controls, and credentials are not present in the workspace payload.
