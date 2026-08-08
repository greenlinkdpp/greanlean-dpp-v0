import type { SupabaseClient } from "@supabase/supabase-js";
import type { DppIdentityContext } from "./dppAccess";
import { ApiError } from "./apiRoute";
import { assessBatteryApplicability, type ApplicabilityInput } from "@/lib/p0/applicability";
import { normalizeP0ImportRows, preflightP0Import, type P0ImportType } from "@/lib/p0/importPreflight";

type AdminClient = SupabaseClient<any, "public", any>;

function fail(error: unknown, code: string, message: string): never {
  const databaseCode = String((error as any)?.code || "");
  if (databaseCode === "23505") throw new ApiError(409, code, message);
  if (databaseCode === "P0002") throw new ApiError(404, code, message);
  throw new ApiError(500, code, message);
}

export function p0OrganisationContext(identity: DppIdentityContext, requestedId?: string | null) {
  if (!identity.canUseDashboard && !identity.isPlatformAdmin) {
    throw new ApiError(403, "P0_BACKOFFICE_ACCESS_REQUIRED", "Backoffice access is required for this operation.");
  }
  const active = identity.memberships.filter((membership) => membership.status === "active");
  if (requestedId) {
    const membership = active.find((item) => item.organisationId === requestedId);
    if (!identity.isPlatformAdmin && !membership) {
      throw new ApiError(403, "ORGANISATION_SCOPE_NOT_GRANTED", "The requested organisation is outside this account scope.");
    }
    return { organisationId: requestedId, membership };
  }
  const membership = active[0];
  if (!membership) throw new ApiError(403, "ORGANISATION_CONTEXT_REQUIRED", "An active organisation membership is required.");
  return { organisationId: membership.organisationId, membership };
}

export function requireP0WriteRole(identity: DppIdentityContext, organisationId: string) {
  if (identity.isPlatformAdmin) return;
  const role = identity.memberships.find((membership) => (
    membership.organisationId === organisationId && membership.status === "active"
  ))?.roleCode;
  if (!role || !["organisation_admin", "service_provider"].includes(role)) {
    throw new ApiError(403, "P0_WRITE_ACCESS_REQUIRED", "Project or product editor access is required.");
  }
}

export function requireP0OrganisationAdmin(identity: DppIdentityContext, organisationId: string) {
  if (identity.isPlatformAdmin) return;
  const role = identity.memberships.find((membership) => (
    membership.organisationId === organisationId && membership.status === "active"
  ))?.roleCode;
  if (role !== "organisation_admin") {
    throw new ApiError(403, "ORGANISATION_ADMIN_ACCESS_REQUIRED", "Organisation administrator access is required.");
  }
}

export async function organisationWorkspace(admin: AdminClient, organisationId: string) {
  const [organisationResult, profileResult] = await Promise.all([
    admin.from("dpp_organisation").select("*").eq("id", organisationId).maybeSingle(),
    admin.from("dpp_economic_operator_profile").select("*").eq("organisation_id", organisationId).eq("is_current", true).maybeSingle(),
  ]);
  if (organisationResult.error) fail(organisationResult.error, "ORGANISATION_LOAD_FAILED", "The organisation could not be loaded.");
  if (!organisationResult.data) throw new ApiError(404, "ORGANISATION_NOT_FOUND", "The organisation was not found.");
  if (profileResult.error && profileResult.error.code !== "PGRST116") {
    fail(profileResult.error, "OPERATOR_PROFILE_LOAD_FAILED", "The economic operator profile could not be loaded.");
  }
  const organisation = organisationResult.data;
  const profile = profileResult.data || null;
  const checks = [
    organisation.legal_name,
    organisation.display_name,
    organisation.country_code,
    Object.keys(organisation.registered_address || {}).length ? organisation.registered_address : null,
    profile?.role_type,
    profile?.legal_name_snapshot,
    profile?.eu_contact_email,
    profile?.verification_status,
  ];
  const completed = checks.filter(Boolean).length;
  return { organisation, profile, completeness: { completed, total: checks.length, percent: Math.round(completed / checks.length * 100) } };
}

export async function saveEconomicOperatorProfile(
  admin: AdminClient,
  organisationId: string,
  actorUserId: string,
  input: Record<string, unknown>,
) {
  if (!String(input.legalName || "").trim()) {
    throw new ApiError(400, "LEGAL_NAME_REQUIRED", "A legal name is required.");
  }
  const { data, error } = await admin.rpc("greanlean_p0_save_economic_operator_profile", {
    target_organisation_id: organisationId,
    profile_data: input,
    actor_user_id: actorUserId,
  });
  if (error) fail(error, "OPERATOR_PROFILE_SAVE_FAILED", "The economic operator profile could not be saved.");
  return data;
}

export async function listProjects(admin: AdminClient, organisationId: string) {
  const { data, error } = await admin.from("dpp_project")
    .select("id,project_code,name,project_type,scope_summary,target_market,status,target_date,applicability_result,applicability_rule_version,row_version,created_at,updated_at")
    .eq("organisation_id", organisationId)
    .order("updated_at", { ascending: false });
  if (error) fail(error, "PROJECT_LIST_FAILED", "Projects could not be loaded.");
  return data || [];
}

export async function createProject(
  admin: AdminClient,
  organisationId: string,
  actorUserId: string,
  input: Record<string, any>,
) {
  const projectCode = String(input.projectCode || "").trim().toUpperCase();
  const name = String(input.name || "").trim();
  const scopeSummary = String(input.scopeSummary || "").trim();
  if (!projectCode || !name || !scopeSummary) {
    throw new ApiError(400, "PROJECT_FIELDS_REQUIRED", "Project code, name and scope are required.");
  }
  const { data, error } = await admin.from("dpp_project").insert({
    organisation_id: organisationId,
    project_code: projectCode,
    name,
    project_type: input.projectType || "PILOT",
    scope_summary: scopeSummary,
    target_market: Array.isArray(input.targetMarket) ? input.targetMarket : ["EU"],
    status: "DRAFT",
    owner_user_id: actorUserId,
    target_date: input.targetDate || null,
    created_by: actorUserId,
    updated_by: actorUserId,
  }).select("*").single();
  if (error) fail(error, "PROJECT_CREATE_FAILED", "The project could not be created.");
  return data;
}

export async function projectWorkspace(admin: AdminClient, organisationId: string, projectId: string) {
  const [projectResult, assessmentsResult, tasksResult, ownershipResult] = await Promise.all([
    admin.from("dpp_project").select("*").eq("id", projectId).eq("organisation_id", organisationId).maybeSingle(),
    admin.from("dpp_applicability_assessment").select("*").eq("project_id", projectId).eq("organisation_id", organisationId).order("assessed_at", { ascending: false }).limit(10),
    admin.from("dpp_project_task").select("*").eq("project_id", projectId).eq("organisation_id", organisationId).order("created_at", { ascending: false }),
    admin.from("dpp_product_ownership").select("product_id,ownership_status,product:products(id,name,name_zh,dpp_id,status)").eq("project_id", projectId).eq("organisation_id", organisationId),
  ]);
  if (projectResult.error) fail(projectResult.error, "PROJECT_LOAD_FAILED", "The project could not be loaded.");
  if (!projectResult.data) throw new ApiError(404, "PROJECT_NOT_FOUND", "The project was not found.");
  if (assessmentsResult.error || tasksResult.error || ownershipResult.error) {
    fail(assessmentsResult.error || tasksResult.error || ownershipResult.error, "PROJECT_WORKSPACE_FAILED", "The project workspace could not be loaded.");
  }
  return {
    project: projectResult.data,
    assessments: assessmentsResult.data || [],
    tasks: tasksResult.data || [],
    products: ownershipResult.data || [],
  };
}

export async function updateProject(
  admin: AdminClient,
  organisationId: string,
  projectId: string,
  actorUserId: string,
  input: Record<string, any>,
) {
  const rowVersion = Number(input.rowVersion);
  if (!Number.isInteger(rowVersion) || rowVersion < 1) {
    throw new ApiError(400, "PROJECT_ROW_VERSION_REQUIRED", "The current project row version is required.");
  }
  const status = input.status ? String(input.status).toUpperCase() : undefined;
  if (status && !["DRAFT", "ACTIVE", "BLOCKED", "ACCEPTANCE", "COMPLETED", "ARCHIVED"].includes(status)) {
    throw new ApiError(400, "PROJECT_STATUS_INVALID", "The requested project status is not supported.");
  }
  const changes: Record<string, unknown> = {
    updated_by: actorUserId,
    updated_at: new Date().toISOString(),
    row_version: rowVersion + 1,
  };
  if (input.name !== undefined) changes.name = String(input.name).trim();
  if (input.scopeSummary !== undefined) changes.scope_summary = String(input.scopeSummary).trim();
  if (input.targetMarket !== undefined) changes.target_market = Array.isArray(input.targetMarket) ? input.targetMarket : [];
  if (input.targetDate !== undefined) changes.target_date = input.targetDate || null;
  if (status) {
    changes.status = status;
    if (status === "ACTIVE") changes.started_at = new Date().toISOString();
    if (status === "COMPLETED") changes.completed_at = new Date().toISOString();
  }
  const { data, error } = await admin.from("dpp_project").update(changes)
    .eq("id", projectId)
    .eq("organisation_id", organisationId)
    .eq("row_version", rowVersion)
    .select("*")
    .maybeSingle();
  if (error) fail(error, "PROJECT_UPDATE_FAILED", "The project could not be updated.");
  if (!data) throw new ApiError(409, "PROJECT_ROW_VERSION_CONFLICT", "The project changed after it was loaded. Refresh and retry.");
  return data;
}

export async function recordApplicability(
  admin: AdminClient,
  organisationId: string,
  projectId: string,
  actorUserId: string,
  input: ApplicabilityInput,
) {
  const assessment = assessBatteryApplicability(input);
  const { data, error } = await admin.rpc("greanlean_p0_record_applicability", {
    target_project_id: projectId,
    target_organisation_id: organisationId,
    assessment_data: assessment,
    gap_tasks: assessment.tasks,
    actor_user_id: actorUserId,
  });
  if (error) fail(error, "APPLICABILITY_SAVE_FAILED", "The applicability assessment could not be saved.");
  return { ...data, assessment };
}

export async function assignProductModel(
  admin: AdminClient,
  organisationId: string,
  projectId: string | null,
  productId: string,
  actorUserId: string,
) {
  const { data, error } = await admin.rpc("greanlean_p0_assign_product_model", {
    target_organisation_id: organisationId,
    target_project_id: projectId,
    target_product_id: productId,
    actor_user_id: actorUserId,
  });
  if (error) fail(error, "PRODUCT_MODEL_ASSIGN_FAILED", "The product model could not be assigned to the organisation.");
  return data;
}

export async function productHierarchy(admin: AdminClient, organisationId: string, productId: string) {
  const { data: ownership, error: ownershipError } = await admin.from("dpp_product_ownership")
    .select("*").eq("product_id", productId).maybeSingle();
  if (ownershipError) fail(ownershipError, "PRODUCT_OWNERSHIP_LOAD_FAILED", "Product ownership could not be loaded.");
  if (ownership?.organisation_id && ownership.organisation_id !== organisationId) {
    throw new ApiError(404, "PRODUCT_MODEL_NOT_FOUND", "The product model was not found.");
  }
  const { data: model, error: modelError } = await admin.from("battery_model_profile")
    .select("*").eq("product_id", productId).maybeSingle();
  if (modelError) fail(modelError, "BATTERY_MODEL_LOAD_FAILED", "The battery model could not be loaded.");
  if (!model) throw new ApiError(404, "BATTERY_MODEL_NOT_FOUND", "The battery model was not found.");
  if (model.organisation_id && model.organisation_id !== organisationId) {
    throw new ApiError(404, "BATTERY_MODEL_NOT_FOUND", "The battery model was not found.");
  }
  const [batchResult, itemResult, publicationResult] = await Promise.all([
    admin.from("battery_batch").select("*").eq("battery_model_profile_id", model.id).order("created_at"),
    admin.from("battery_item").select("*").eq("battery_model_profile_id", model.id).order("created_at"),
    admin.from("dpp_item_publication_pointer").select("battery_item_id,publication:dpp_publication(id,version_number,status,snapshot_hash,published_at)")
      .in("battery_item_id", (await admin.from("battery_item").select("id").eq("battery_model_profile_id", model.id)).data?.map((row: any) => row.id) || []),
  ]);
  if (batchResult.error || itemResult.error || publicationResult.error) {
    fail(batchResult.error || itemResult.error || publicationResult.error, "BATTERY_HIERARCHY_LOAD_FAILED", "The battery hierarchy could not be loaded.");
  }
  return { ownership: ownership || null, model, batches: batchResult.data || [], items: itemResult.data || [], publications: publicationResult.data || [] };
}

export async function bulkCreateItems(
  admin: AdminClient,
  organisationId: string,
  productId: string,
  batchId: string | null,
  items: Array<Record<string, unknown>>,
  idempotencyKey: string,
  actorUserId: string,
) {
  const serials = items.map((item) => String(item.serialNumber || "").trim().toUpperCase());
  if (new Set(serials).size !== serials.length) {
    throw new ApiError(400, "DUPLICATE_SERIAL_IN_REQUEST", "The request contains duplicate serial numbers.");
  }
  const { data, error } = await admin.rpc("greanlean_p0_bulk_create_battery_items", {
    target_organisation_id: organisationId,
    target_product_id: productId,
    target_batch_id: batchId,
    item_rows: items,
    idempotency_key_value: idempotencyKey,
    actor_user_id: actorUserId,
  });
  if (error) fail(error, "BATTERY_ITEM_BULK_CREATE_FAILED", "Battery items could not be created.");
  return data;
}

export async function preflightImport(
  admin: AdminClient,
  organisationId: string,
  projectId: string | null,
  actorUserId: string,
  type: P0ImportType,
  rows: Array<Record<string, unknown>>,
  idempotencyKey: string,
) {
  if (!(["BATTERY_ITEMS", "BOM", "FIELD_VALUES"] as string[]).includes(type)) {
    throw new ApiError(400, "IMPORT_TYPE_UNSUPPORTED", "The requested P0 import type is not supported.");
  }
  if (rows.length < 1 || rows.length > 1000) {
    throw new ApiError(400, "IMPORT_ROW_LIMIT", "A preflight must contain between 1 and 1000 rows.");
  }
  if (idempotencyKey.trim().length < 8) {
    throw new ApiError(400, "IDEMPOTENCY_KEY_REQUIRED", "An idempotency key of at least 8 characters is required.");
  }

  const result = preflightP0Import(type, rows);
  if (projectId) {
    const { data: project, error } = await admin.from("dpp_project")
      .select("id")
      .eq("id", projectId)
      .eq("organisation_id", organisationId)
      .maybeSingle();
    if (error) fail(error, "IMPORT_PROJECT_LOOKUP_FAILED", "The import project could not be checked.");
    if (!project) throw new ApiError(404, "IMPORT_PROJECT_NOT_FOUND", "The import project was not found in this organisation.");
  }
  const { data: existing, error: existingError } = await admin.from("dpp_import_job")
    .select("id,input_hash,result_summary")
    .eq("organisation_id", organisationId)
    .eq("job_type", type)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existingError) fail(existingError, "IMPORT_PREFLIGHT_LOOKUP_FAILED", "The import preflight could not be loaded.");
  if (existing) {
    if (existing.input_hash !== result.inputHash) {
      throw new ApiError(409, "IDEMPOTENCY_KEY_REUSED", "This idempotency key was already used for different input.");
    }
    return { jobId: existing.id, ...(existing.result_summary || result) };
  }

  const { data: job, error: jobError } = await admin.from("dpp_import_job").insert({
    organisation_id: organisationId,
    project_id: projectId,
    job_type: type,
    template_version: result.templateVersion,
    idempotency_key: idempotencyKey,
    input_hash: result.inputHash,
    status: "PREVIEWED",
    total_rows: result.totalRows,
    successful_rows: result.successfulRows,
    warning_rows: result.warningRows,
    failed_rows: result.failedRows,
    result_summary: result,
    submitted_by: actorUserId,
  }).select("id").single();
  if (jobError) fail(jobError, "IMPORT_PREFLIGHT_SAVE_FAILED", "The import preflight could not be saved.");
  if (result.errors.length) {
    const { error } = await admin.from("dpp_import_error").insert(result.errors.map((item) => ({
      job_id: job.id,
      row_number: item.rowNumber,
      column_name: item.columnName,
      field_key: item.fieldKey,
      error_code: item.code,
      message: item.message,
      raw_value: item.rawValue,
      severity: item.severity,
      suggested_fix: item.suggestedFix,
    })));
    if (error) fail(error, "IMPORT_PREFLIGHT_ERROR_SAVE_FAILED", "The import errors could not be saved.");
  }
  return { jobId: job.id, ...result };
}

export async function commitBomImport(
  admin: AdminClient,
  organisationId: string,
  jobId: string,
  productId: string,
  actorUserId: string,
  rows: Array<Record<string, unknown>>,
) {
  const preflight = preflightP0Import("BOM", rows);
  if (!preflight.canCommit) {
    throw new ApiError(400, "BOM_IMPORT_PREFLIGHT_FAILED", "The BOM still contains blocking import errors.", {
      errors: preflight.errors,
    });
  }
  const { data, error } = await admin.rpc("greanlean_p0_commit_bom_import", {
    target_job_id: jobId,
    target_organisation_id: organisationId,
    target_product_id: productId,
    expected_input_hash: preflight.inputHash,
    bom_rows: normalizeP0ImportRows("BOM", rows),
    actor_user_id: actorUserId,
  });
  if (error) fail(error, "BOM_IMPORT_COMMIT_FAILED", "The preflighted BOM could not be committed.");
  return data;
}
