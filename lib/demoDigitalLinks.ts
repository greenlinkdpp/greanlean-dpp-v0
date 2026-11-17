import identities from "../config/demo-digital-links.json" with { type: "json" };

// These identify synthetic showcase records, not real-world trade items.
// The 950 example was explicitly supplied by the owner; new examples use 952.
export const DEMO_DIGITAL_LINK_IDENTITIES = identities;

export function demoDigitalLinkIdentity(identifier: string) {
  return identities.find((identity) => identity.passportIdentifier === identifier);
}

export function demoDigitalLinkPath(identifier: string) {
  const identity = demoDigitalLinkIdentity(identifier);
  return identity
    ? `/01/${identity.gtin}/21/${encodeURIComponent(identity.serialNumber)}`
    : null;
}
