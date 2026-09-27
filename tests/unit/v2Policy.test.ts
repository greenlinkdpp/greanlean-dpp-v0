import assert from "node:assert/strict";
import test from "node:test";
import { evaluateV2Policy, type V2AuthorityGrant } from "../../lib/v2/policy.ts";

const now = new Date("2026-09-24T12:00:00Z");

function membership(overrides: Partial<V2AuthorityGrant> = {}): V2AuthorityGrant {
  return {
    source: "TENANT_MEMBERSHIP",
    id: "membership-a",
    tenantId: "tenant-a",
    status: "ACTIVE",
    validFrom: "2026-01-01T00:00:00Z",
    validUntil: null,
    capabilities: ["organisation.view"],
    scopes: [],
    ...overrides,
  };
}

function partner(overrides: Partial<V2AuthorityGrant> = {}): V2AuthorityGrant {
  return {
    source: "PARTNER_AUTHORIZATION",
    id: "authorization-a",
    tenantId: "tenant-a",
    partnerId: "partner-p",
    status: "ACTIVE",
    validFrom: "2026-01-01T00:00:00Z",
    validUntil: null,
    capabilities: ["organisation.view"],
    scopes: [{
      resourceType: "ORGANISATION",
      resourceId: "organisation-a1",
      effect: "ALLOW",
      status: "ACTIVE",
      validFrom: "2026-01-01T00:00:00Z",
      validUntil: null,
    }],
    ...overrides,
  };
}

const request = {
  authenticated: true,
  requestedTenantId: "tenant-a",
  capability: "organisation.view",
  resourceType: "ORGANISATION",
  resourceId: "organisation-a1",
  now,
};

test("tenant membership grants only its own tenant capability", () => {
  assert.equal(evaluateV2Policy({ ...request, authorityGrants: [membership()] }).decision, "ALLOW");
  const forged = evaluateV2Policy({ ...request, requestedTenantId: "tenant-b", authorityGrants: [membership()] });
  assert.equal(forged.decision, "DENY");
  assert.equal(forged.reasonCode, "TENANT_RELATIONSHIP_REQUIRED");
});

test("platform role never grants automatic tenant access", () => {
  const decision = evaluateV2Policy({ ...request, authorityGrants: [], hasPlatformRole: true });
  assert.equal(decision.decision, "DENY");
  assert.equal(decision.reasonCode, "PLATFORM_ROLE_TENANT_DENIED");
});

test("partner without a binding is denied", () => {
  const decision = evaluateV2Policy({ ...request, authorityGrants: [] });
  assert.equal(decision.decision, "DENY");
  assert.equal(decision.reasonCode, "TENANT_RELATIONSHIP_REQUIRED");
});

test("expired and revoked partner authorizations are denied", () => {
  const expired = evaluateV2Policy({
    ...request,
    authorityGrants: [partner({ validUntil: "2026-09-23T00:00:00Z" })],
  });
  assert.equal(expired.reasonCode, "AUTHORIZATION_EXPIRED");

  const revoked = evaluateV2Policy({ ...request, authorityGrants: [partner({ status: "REVOKED" })] });
  assert.equal(revoked.reasonCode, "AUTHORIZATION_REVOKED");
});

test("partner capability is constrained by resource scope", () => {
  const allowed = evaluateV2Policy({ ...request, authorityGrants: [partner()] });
  assert.equal(allowed.decision, "ALLOW");
  assert.equal(allowed.actorType, "PARTNER");

  const denied = evaluateV2Policy({
    ...request,
    resourceId: "organisation-b1",
    authorityGrants: [partner()],
  });
  assert.equal(denied.decision, "DENY");
  assert.equal(denied.reasonCode, "RESOURCE_OUT_OF_SCOPE");
});

test("matching explicit deny scope wins over allow", () => {
  const grant = partner({
    scopes: [
      ...partner().scopes,
      {
        resourceType: "ORGANISATION",
        resourceId: "organisation-a1",
        effect: "DENY",
        status: "ACTIVE",
        validFrom: "2026-01-01T00:00:00Z",
      },
    ],
  });
  const decision = evaluateV2Policy({ ...request, authorityGrants: [grant] });
  assert.equal(decision.decision, "DENY");
});
