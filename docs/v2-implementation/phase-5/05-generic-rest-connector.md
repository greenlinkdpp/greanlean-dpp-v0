# Generic REST Connector

The Generic REST connector provides a bounded transport for `GET`, `POST`, `PUT` and `PATCH`. It is not a generic network proxy.

Before each request it validates scheme, hostname, DNS result and redirect policy. Redirects are handled manually so every hop is subject to the same SSRF checks. Execution applies timeout, response-size and allowed-content-type limits. Headers and bodies are redacted before diagnostic or receipt persistence.

Connector configuration supplies the endpoint, allowed hosts, request timeout, response maximum and retry/rate profiles. `POST /api/v2/connectors/{id}/test` validates reachability/configuration through the same policy boundary. Production instances are rejected.

Security tests cover unsafe schemes, loopback/private destinations, non-allowlisted hosts, DNS resolution, redirect chains, response bounds and safe redaction.
