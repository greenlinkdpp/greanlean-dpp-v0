import { createTenantCollectionHandlers } from "@/lib/server/v2/collectionRoute";

const handlers = createTenantCollectionHandlers({
  table: "partner_tenant_authorization",
  resourceType: "PARTNER_AUTHORIZATION",
  readCapability: "partner_authorization.view",
  writeCapability: "partner_authorization.propose",
  insertFields: [
    "partner_id",
    "permission_profile_id",
    "scope",
    "valid_from",
    "valid_until",
    "approval_evidence_reference",
  ],
  partnerFeature: true,
  serverFields: (context) => ({ status: "PENDING", requested_by: context.user.id }),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
