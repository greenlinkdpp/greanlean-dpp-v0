export const PLATFORM_CAPABILITIES = [
  "platform.tenant.list",
  "platform.tenant.view",
  "platform.tenant.create",
  "platform.tenant.manage",
  "platform.organisation.view",
  "platform.organisation.manage",
  "platform.product.view",
  "platform.product.manage",
  "platform.import.view",
  "platform.import.manage",
  "platform.claim.view",
  "platform.claim.manage",
  "platform.dpp.view",
  "platform.dpp.manage",
  "platform.dpp.review",
  "platform.dpp.approve",
  "platform.dpp.publish",
  "platform.dpp.withdraw",
  "platform.resolver.view",
  "platform.resolver.manage",
  "platform.audit.view",
  "platform.operations.view",
] as const;

export type PlatformCapability = typeof PLATFORM_CAPABILITIES[number];

const TENANT_TO_PLATFORM_CAPABILITY: Record<string, PlatformCapability> = {
  "tenant.view": "platform.tenant.view",
  "tenant.manage": "platform.tenant.manage",
  "membership.view": "platform.tenant.view",
  "membership.manage": "platform.tenant.manage",
  "partner.view": "platform.tenant.view",
  "partner.manage": "platform.tenant.manage",
  "partner_authorization.view": "platform.tenant.view",
  "partner_authorization.propose": "platform.tenant.manage",
  "partner_authorization.approve": "platform.tenant.manage",
  "partner_authorization.revoke": "platform.tenant.manage",
  "organisation.view": "platform.organisation.view",
  "organisation.edit": "platform.organisation.manage",
  "product.view": "platform.product.view",
  "product.edit": "platform.product.manage",
  "schema.view": "platform.import.view",
  "schema.manage": "platform.import.manage",
  "import.create": "platform.import.manage",
  "import.commit": "platform.import.manage",
  "dpp.view": "platform.dpp.view",
  "dpp.create": "platform.dpp.manage",
  "dpp.edit": "platform.dpp.manage",
  "dpp.submit_review": "platform.dpp.review",
  "dpp.review": "platform.dpp.review",
  "dpp.request_changes": "platform.dpp.review",
  "dpp.approve": "platform.dpp.approve",
  "dpp.reject": "platform.dpp.approve",
  "dpp.publish": "platform.dpp.publish",
  "dpp.withdraw": "platform.dpp.withdraw",
  "identifier.manage": "platform.resolver.manage",
  "registry.view": "platform.resolver.view",
  "registry.submit": "platform.dpp.publish",
  "connector.view": "platform.operations.view",
  "connector.read_receipt": "platform.operations.view",
  "connector.manage": "platform.import.manage",
  "connector.execute": "platform.import.manage",
  "connector.retry": "platform.import.manage",
  "webhook.manage": "platform.import.manage",
};

export function platformCapabilityForTenantOperation(tenantCapability: string): PlatformCapability | null {
  return TENANT_TO_PLATFORM_CAPABILITY[tenantCapability] || null;
}

export function tenantOperationCapabilities(platformCapabilities: readonly string[]) {
  const granted = new Set(platformCapabilities);
  return Object.entries(TENANT_TO_PLATFORM_CAPABILITY)
    .filter(([, platformCapability]) => granted.has(platformCapability))
    .map(([tenantCapability]) => tenantCapability)
    .sort();
}
