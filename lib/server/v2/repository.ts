import { canonicalHash } from "../dppCanonicalization";
import { ApiError } from "../apiRoute";
import { assertVerifiedPolicyContext, type VerifiedV2PolicyContext } from "./security";

type AdminClient = any;

const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{8,128}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function databaseError(code: string, message: string, error: any): never {
  throw new ApiError(500, code, message, { database_code: error?.code || null });
}

export function requireIdempotencyKey(request: Request) {
  const key = request.headers.get("idempotency-key")?.trim() || "";
  if (!IDEMPOTENCY_KEY.test(key)) {
    throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "A valid Idempotency-Key header is required.");
  }
  return key;
}

export function requireJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "INVALID_REQUEST_BODY", "The request body must be a JSON object.");
  }
  return value as Record<string, unknown>;
}

export function requireUuid(value: string, field: string) {
  if (!UUID.test(value)) {
    throw new ApiError(400, "INVALID_IDENTIFIER", `A valid ${field} is required.`);
  }
  return value;
}

export function allowFields(input: Record<string, unknown>, fields: readonly string[]) {
  const unknown = Object.keys(input).filter((key) => !fields.includes(key));
  if (unknown.length > 0) {
    throw new ApiError(400, "UNKNOWN_FIELDS", "The request contains unsupported fields.", { fields: unknown });
  }
  return Object.fromEntries(Object.entries(input).filter(([key]) => fields.includes(key)));
}

export async function executeIdempotentWrite<T>(options: {
  admin: AdminClient;
  context: VerifiedV2PolicyContext;
  requestPath: string;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  operation: () => Promise<{ status: number; data: T }>;
}) {
  assertVerifiedPolicyContext(options.context);
  const { hash: requestHash } = canonicalHash(options.payload);
  const key = {
    tenant_id: options.context.tenantId,
    actor_user_id: options.context.user.id,
    request_path: options.requestPath,
    idempotency_key: options.idempotencyKey,
  };
  const { data: existing, error: lookupError } = await options.admin
    .from("v2_idempotency_record")
    .select("request_hash,response_status,response_body,expires_at")
    .match(key)
    .maybeSingle();
  if (lookupError) databaseError("IDEMPOTENCY_LOOKUP_FAILED", "The idempotency record could not be read.", lookupError);
  if (existing) {
    if (existing.request_hash !== requestHash) {
      throw new ApiError(409, "IDEMPOTENCY_KEY_REUSED", "The Idempotency-Key was already used for a different request.");
    }
    if (existing.response_status && existing.response_body) {
      return {
        status: existing.response_status as number,
        data: existing.response_body as { data: T },
        replay: true,
      };
    }
    throw new ApiError(409, "IDEMPOTENCY_REQUEST_IN_PROGRESS", "An equivalent request is already in progress.");
  }

  const { error: reserveError } = await options.admin.from("v2_idempotency_record").insert({
    ...key,
    request_hash: requestHash,
  });
  if (reserveError) {
    if (reserveError.code === "23505") throw new ApiError(409, "IDEMPOTENCY_REQUEST_IN_PROGRESS", "An equivalent request is already in progress.");
    databaseError("IDEMPOTENCY_RESERVATION_FAILED", "The request could not be reserved.", reserveError);
  }

  try {
    const result = await options.operation();
    const responseBody = { data: result.data };
    const { error: completeError } = await options.admin
      .from("v2_idempotency_record")
      .update({ response_status: result.status, response_body: responseBody })
      .match(key);
    if (completeError) databaseError("IDEMPOTENCY_COMPLETION_FAILED", "The response could not be recorded.", completeError);
    return { status: result.status, data: responseBody, replay: false };
  } catch (error) {
    await options.admin.from("v2_idempotency_record").delete().match(key);
    throw error;
  }
}

export async function listTenantRows(
  admin: AdminClient,
  context: VerifiedV2PolicyContext,
  table: string,
  columns = "*",
) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin.from(table).select(columns).eq("tenant_id", context.tenantId).limit(200);
  if (error) databaseError("V2_LIST_FAILED", "The requested records could not be loaded.", error);
  return data || [];
}

export async function createTenantRow(
  admin: AdminClient,
  context: VerifiedV2PolicyContext,
  table: string,
  input: Record<string, unknown>,
) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin
    .from(table)
    .insert({ ...input, tenant_id: context.tenantId })
    .select()
    .single();
  if (error) databaseError("V2_CREATE_FAILED", "The requested record could not be created.", error);
  return data;
}

export async function loadTenant(admin: AdminClient, context: VerifiedV2PolicyContext) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin.from("tenant").select("*").eq("id", context.tenantId).single();
  if (error) databaseError("V2_TENANT_LOAD_FAILED", "The tenant could not be loaded.", error);
  return data;
}

export async function updateTenant(admin: AdminClient, context: VerifiedV2PolicyContext, input: Record<string, unknown>) {
  assertVerifiedPolicyContext(context);
  const { data, error } = await admin.from("tenant").update(input).eq("id", context.tenantId).select().single();
  if (error) databaseError("V2_TENANT_UPDATE_FAILED", "The tenant could not be updated.", error);
  return data;
}

export async function listPartners(admin: AdminClient, context: VerifiedV2PolicyContext) {
  assertVerifiedPolicyContext(context);
  const { data: bindings, error: bindingError } = await admin
    .from("partner_tenant_authorization")
    .select("partner_id")
    .eq("tenant_id", context.tenantId);
  if (bindingError) databaseError("V2_PARTNER_BINDING_LIST_FAILED", "Partner bindings could not be loaded.", bindingError);
  const ids = Array.from(new Set<string>((bindings || []).map((row: any) => String(row.partner_id))));
  if (ids.length === 0) return [];
  const { data, error } = await admin.from("partner").select("*").in("id", ids);
  if (error) databaseError("V2_PARTNER_LIST_FAILED", "Partners could not be loaded.", error);
  return data || [];
}

export async function createPartnerProposal(
  admin: AdminClient,
  context: VerifiedV2PolicyContext,
  input: Record<string, unknown>,
) {
  assertVerifiedPolicyContext(context);
  const { permission_profile_id, scope, valid_from, valid_until, ...partnerInput } = input;
  const { data: partner, error: partnerError } = await admin.from("partner").insert(partnerInput).select().single();
  if (partnerError) databaseError("V2_PARTNER_CREATE_FAILED", "The partner could not be created.", partnerError);
  const { data: authorization, error: authorizationError } = await admin
    .from("partner_tenant_authorization")
    .insert({
      partner_id: partner.id,
      tenant_id: context.tenantId,
      permission_profile_id,
      scope: scope || {},
      valid_from: valid_from || new Date().toISOString(),
      valid_until: valid_until || null,
      status: "PENDING",
      requested_by: context.user.id,
    })
    .select()
    .single();
  if (authorizationError) {
    await admin.from("partner").delete().eq("id", partner.id);
    databaseError("V2_PARTNER_AUTHORIZATION_CREATE_FAILED", "The partner authorization proposal could not be created.", authorizationError);
  }
  return { partner, authorization };
}

export async function transitionPartnerAuthorization(
  admin: AdminClient,
  context: VerifiedV2PolicyContext,
  authorizationId: string,
  action: "APPROVE" | "REVOKE",
  input: Record<string, unknown>,
) {
  assertVerifiedPolicyContext(context);
  const now = new Date().toISOString();
  const values = action === "APPROVE"
    ? {
      status: "ACTIVE",
      approved_by: context.user.id,
      approved_at: now,
      ...(input.approval_evidence_reference
        ? { approval_evidence_reference: input.approval_evidence_reference }
        : {}),
    }
    : { status: "REVOKED" };
  let query = admin
    .from("partner_tenant_authorization")
    .update(values)
    .eq("id", authorizationId)
    .eq("tenant_id", context.tenantId);
  query = action === "APPROVE"
    ? query.eq("status", "PENDING")
    : query.in("status", ["PENDING", "ACTIVE", "SUSPENDED"]);
  const { data, error } = await query.select().maybeSingle();
  if (error) databaseError("V2_PARTNER_AUTHORIZATION_UPDATE_FAILED", "The partner authorization could not be updated.", error);
  if (!data) {
    throw new ApiError(409, "INVALID_AUTHORIZATION_TRANSITION", "The partner authorization cannot make the requested transition.");
  }
  return data;
}

export async function createRoleWithCapabilities(
  admin: AdminClient,
  context: VerifiedV2PolicyContext,
  input: Record<string, unknown>,
) {
  assertVerifiedPolicyContext(context);
  const capabilityCodes = Array.isArray(input.capability_codes) ? input.capability_codes : [];
  const { capability_codes: _, ...roleInput } = input;
  const { data: role, error: roleError } = await admin
    .from("role")
    .insert({ ...roleInput, tenant_id: context.tenantId, role_class: "TENANT" })
    .select()
    .single();
  if (roleError) databaseError("V2_ROLE_CREATE_FAILED", "The role could not be created.", roleError);
  if (capabilityCodes.length > 0) {
    const { data: capabilities, error: capabilityError } = await admin
      .from("capability")
      .select("id,code")
      .in("code", capabilityCodes);
    if (capabilityError || capabilities?.length !== capabilityCodes.length) {
      await admin.from("role").delete().eq("id", role.id);
      throw new ApiError(400, "UNKNOWN_CAPABILITY", "One or more capabilities are invalid.");
    }
    const { error: mappingError } = await admin.from("role_capability").insert(
      capabilities.map((capability: any) => ({ role_id: role.id, capability_id: capability.id })),
    );
    if (mappingError) {
      await admin.from("role").delete().eq("id", role.id);
      databaseError("V2_ROLE_CAPABILITY_CREATE_FAILED", "The role capabilities could not be created.", mappingError);
    }
  }
  return role;
}
