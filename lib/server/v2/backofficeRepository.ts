import { ApiError } from "../apiRoute";
import { assertVerifiedPolicyContext, type VerifiedV2PolicyContext } from "./security";
import { platformCapabilityForTenantOperation } from "@/lib/v2/platformCapabilities";

type AdminClient = any;

async function rows(admin: AdminClient, table: string, select: string, tenantId: string, options: { order?: string; ascending?: boolean; limit?: number } = {}) {
  let query = admin.from(table).select(select).eq("tenant_id", tenantId);
  if (options.order) query = query.order(options.order, { ascending: options.ascending ?? false });
  if (options.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  if (error) throw new ApiError(500, "BACKOFFICE_SNAPSHOT_FAILED", `The ${table} operator view could not be loaded.`);
  return data || [];
}

async function globalRows(admin: AdminClient, table: string, select: string, ids: string[]) {
  if (ids.length === 0) return [];
  const { data, error } = await admin.from(table).select(select).in("id", ids);
  if (error) throw new ApiError(500, "BACKOFFICE_REFERENCE_FAILED", `The ${table} reference view could not be loaded.`);
  return data || [];
}

export async function loadBackofficeSnapshot(admin: AdminClient, context: VerifiedV2PolicyContext) {
  assertVerifiedPolicyContext(context);
  const tenantId = context.tenantId;
  if (context.actorType !== "TENANT" && context.actorType !== "PLATFORM") {
    throw new ApiError(403, "BACKOFFICE_TENANT_AUTHORITY_REQUIRED", "The aggregate operator console requires a Tenant membership; Partners must use resource-scoped APIs.");
  }
  const authority = context.actorType === "PLATFORM"
    ? await admin.from("platform_role_assignment").select("role_id").eq("id", context.authorityId).eq("status", "ACTIVE").maybeSingle()
    : await admin.from("tenant_membership").select("role_id").eq("id", context.authorityId).eq("tenant_id", tenantId).maybeSingle();
  if (authority.error || !authority.data) throw new ApiError(403, "BACKOFFICE_AUTHORITY_NOT_FOUND", "The verified operator authority is no longer available.");
  const capabilityResult = await admin.from("role_capability").select("capability:capability(code,status)").eq("role_id", authority.data.role_id);
  if (capabilityResult.error) throw new ApiError(500, "BACKOFFICE_CAPABILITY_LOOKUP_FAILED", "Operator capabilities could not be loaded.");
  const capabilities = new Set<string>((capabilityResult.data || []).flatMap((row: any) => {
    const capability = Array.isArray(row.capability) ? row.capability[0] : row.capability;
    return capability?.status === "ACTIVE" && typeof capability.code === "string" ? [capability.code] : [];
  }));
  const can = (code: string) => {
    if (capabilities.has(code)) return true;
    const platformCapability = platformCapabilityForTenantOperation(code);
    return context.actorType === "PLATFORM" && Boolean(platformCapability && capabilities.has(platformCapability));
  };
  const tenantResult = await admin.from("tenant").select("id,code,name,status,residency_policy,created_at,updated_at").eq("id", tenantId).maybeSingle();
  if (tenantResult.error || !tenantResult.data) throw new ApiError(404, "TENANT_NOT_FOUND", "The authorised Tenant was not found.");

  const [
    organisations, memberships, partnerAuthorizations, families, models, skus, batches, batchSkuLinks, items,
    identifiers, dataSources, sourceRecords, mappingProfiles, mappingVersions, mappingRules, transformations,
    provenance, claims, passports, reviews, versions, currentPointers, resolverMappings, publicationAudit,
    connectors, connectorJobs, connectorAttempts, connectorReceipts, deadLetters, importSessions,
    registrySubmissions, bmsSnapshots, connectorAudit, policyAudit,
  ] = await Promise.all([
    rows(admin, "organisation_v2", "id,parent_organisation_id,organisation_type,legal_name,trading_name,country,registration_identifier,vat_number,eori,address,status,created_at,updated_at", tenantId),
    rows(admin, "tenant_membership", "id,role_id,status,valid_from,valid_until,created_at,updated_at", tenantId),
    rows(admin, "partner_tenant_authorization", "id,partner_id,permission_profile_id,scope,valid_from,valid_until,status,approved_at,approval_evidence_reference,created_at,updated_at", tenantId),
    rows(admin, "product_family", "id,code,name,description,status,created_at,updated_at", tenantId),
    rows(admin, "product_model", "id,family_id,manufacturer_organisation_id,model_code,name,description,product_category,sector,status,created_at,updated_at", tenantId),
    rows(admin, "sku", "id,model_id,sku_code,name,market,configuration_json,status,created_at,updated_at", tenantId),
    rows(admin, "product_batch", "id,model_id,batch_number,manufacturing_organisation_id,production_date,status,created_at,updated_at", tenantId),
    rows(admin, "batch_sku_link", "id,model_id,batch_id,sku_id,status,valid_from,valid_until,created_at", tenantId),
    rows(admin, "product_item", "id,model_id,sku_id,batch_id,serial_number,upi,enforce_batch_sku_link,status,created_at,updated_at", tenantId),
    rows(admin, "product_subject_identifier", "id,subject_type,subject_id,identifier_type,value,normalized_value,issuer,scheme,valid_from,valid_until,is_primary,status,created_at", tenantId),
    rows(admin, "data_source", "id,source_type,name,provider_organisation_id,system_identifier,trust_level,status,residency_classification,connector_reference,created_at,updated_at", tenantId),
    rows(admin, "source_record", "id,data_source_id,external_record_id,subject_type,subject_id,subject_hint,payload_mode,payload_json,payload_reference,payload_hash,observed_at,received_at,classification,status", tenantId, { order: "received_at", limit: 100 }),
    rows(admin, "mapping_profile", "id,data_source_id,target_schema_definition_id,name,status,created_at,updated_at", tenantId),
    rows(admin, "mapping_version", "id,mapping_profile_id,version,status,content_hash,activated_at,retired_at,created_at", tenantId),
    rows(admin, "mapping_rule", "id,mapping_version_id,source_pointer,target_field_definition_id,source_unit,transform_type,transform_config,condition_config,null_policy,lossiness,sort_order,created_at", tenantId),
    rows(admin, "transformation_result", "id,source_record_id,mapping_version_id,status,input_hash,output_hash,warnings,errors,started_at,finished_at,correlation_id", tenantId, { order: "started_at", limit: 100 }),
    rows(admin, "provenance_record", "id,subject_type,subject_id,field_definition_id,provider_organisation_id,data_source_id,source_record_id,raw_value_reference,normalized_value_reference,mapping_version_id,observed_at,ingested_at,verification_status,verification_method,evidence_references,source_disclosure,created_at", tenantId, { order: "created_at", limit: 500 }),
    rows(admin, "canonical_claim", "id,subject_type,subject_id,field_definition_id,schema_version_id,resolution_state,value_json,canonical_unit,effective_from,effective_to,verification_status,provenance_record_id,supersedes_claim_id,applicability_reason,created_at", tenantId, { order: "created_at", limit: 1000 }),
    rows(admin, "dpp_passport", "id,subject_type,subject_id,passport_profile_code,passport_identifier,schema_definition_id,publication_source,status,created_at,updated_at", tenantId),
    rows(admin, "dpp_review_task", "id,passport_id,subject_type,subject_id,candidate_hash,schema_version_id,resolution_algorithm_version,validation_summary,generated_at,status,submitted_at,reviewed_at,decision_reason,published_version_id,created_at", tenantId, { order: "submitted_at", limit: 200 }),
    rows(admin, "dpp_version", "id,passport_id,version_number,schema_version_id,review_task_id,candidate_hash,payload_hash,canonicalization_version,content_workflow_state,publication_state,registry_state,published_at,supersedes_version_id,withdraw_reason_category,withdrawn_at,created_at", tenantId, { order: "created_at", limit: 200 }),
    rows(admin, "dpp_current_pointer", "passport_id,current_version_id,updated_at", tenantId),
    rows(admin, "resolver_mapping", "id,identifier_id,host,normalized_path,passport_id,target_mapping_id,mapping_type,status,is_public,valid_from,valid_until,redirect_http_status,created_at,updated_at", tenantId),
    rows(admin, "dpp_publication_audit", "id,event_type,passport_id,version_id,review_task_id,resolver_mapping_id,candidate_hash,payload_hash,schema_version_id,previous_current_version_id,new_current_version_id,correlation_id,metadata,created_at", tenantId, { order: "created_at", limit: 200 }),
    rows(admin, "connector_instance", "id,connector_definition_id,name,environment,status,data_source_id,mapping_profile_id,rate_limit_profile,retry_profile,circuit_state,circuit_opened_at,last_successful_sync_at,sync_watermark,created_at,updated_at", tenantId),
    rows(admin, "connector_job", "id,connector_instance_id,job_type,direction,status,idempotency_key,subject_type,subject_id,passport_id,version_id,mapping_version_id,requested_at,started_at,finished_at,correlation_id,adapter_version,retry_count,next_attempt_at,local_cancelled,external_state_unknown", tenantId, { order: "requested_at", limit: 200 }),
    rows(admin, "connector_attempt", "id,job_id,attempt_number,started_at,finished_at,status,http_status,error_code,error_class,retryable,latency_ms,created_at", tenantId, { order: "created_at", limit: 200 }),
    rows(admin, "connector_receipt", "id,job_id,external_system,external_request_id,external_object_id,external_status,received_at,payload_hash,adapter_version", tenantId, { order: "received_at", limit: 200 }),
    rows(admin, "connector_dead_letter", "id,job_id,failure_reason,recovery_action,last_attempt_id,requeued_at,created_at", tenantId, { order: "created_at", limit: 200 }),
    rows(admin, "connector_import_session", "id,connector_instance_id,connector_job_id,mapping_version_id,file_format,file_hash,status,reconciliation_summary,unmapped_fields,error_summary,created_at,committed_at", tenantId, { order: "created_at", limit: 200 }),
    rows(admin, "registry_submission_v2", "id,connector_instance_id,connector_job_id,passport_id,version_id,operation,state,payload_hash,registry_profile,adapter_version,external_request_id,submitted_at,completed_at,created_at", tenantId, { order: "created_at", limit: 200 }),
    rows(admin, "bms_aggregation_snapshot", "id,connector_instance_id,item_id,device_external_id,window_start,window_end,algorithm_version,sample_count,aggregate_json,threshold_events,canonical_claim_id,created_at", tenantId, { order: "window_end", limit: 200 }),
    rows(admin, "connector_audit_event", "id,event_type,connector_instance_id,connector_job_id,correlation_id,safe_metadata,created_at", tenantId, { order: "created_at", limit: 200 }),
    rows(admin, "policy_decision_audit", "id,actor_type,partner_id,capability_code,resource_type,resource_id,purpose,decision,reason_code,effective_scope,policy_version,correlation_id,request_path,created_at", tenantId, { order: "created_at", limit: 200 }),
  ]);

  const fieldIds = Array.from(new Set<string>([
    ...claims.map((row: any) => row.field_definition_id),
    ...provenance.map((row: any) => row.field_definition_id),
    ...mappingRules.map((row: any) => row.target_field_definition_id),
  ].filter((value): value is string => typeof value === "string" && value.length > 0)));
  const schemaVersionIds = Array.from(new Set<string>([
    ...claims.map((row: any) => row.schema_version_id),
    ...reviews.map((row: any) => row.schema_version_id),
    ...versions.map((row: any) => row.schema_version_id),
  ].filter((value): value is string => typeof value === "string" && value.length > 0)));
  const connectorDefinitionIds = Array.from(new Set<string>(connectors
    .map((row: any) => row.connector_definition_id)
    .filter((value: unknown): value is string => typeof value === "string" && value.length > 0)));

  const [fields, validationRules, accessPolicies, connectorDefinitions] = await Promise.all([
    globalRows(admin, "field_definition", "id,schema_version_id,field_code,label_en,label_zh,description_en,description_zh,data_type,unit_code,data_behavior,data_granularity,access_level_code,requirement_status,evidence_requirement,sort_order", fieldIds),
    schemaVersionIds.length ? admin.from("validation_rule").select("id,schema_version_id,field_definition_id,rule_code,rule_type,error_code,message_en,message_zh,severity,rule_version,sort_order").in("schema_version_id", schemaVersionIds).then(({ data, error }: any) => {
      if (error) throw new ApiError(500, "BACKOFFICE_VALIDATION_RULE_FAILED", "Validation rules could not be loaded.");
      return data || [];
    }) : [],
    schemaVersionIds.length ? admin.from("access_policy").select("id,schema_version_id,field_definition_id,policy_code,access_level_code,allowed_roles,condition_config,purpose_required,status").in("schema_version_id", schemaVersionIds).then(({ data, error }: any) => {
      if (error) throw new ApiError(500, "BACKOFFICE_ACCESS_POLICY_FAILED", "Access policies could not be loaded.");
      return data || [];
    }) : [],
    globalRows(admin, "connector_definition", "id,code,name,connector_type,direction,capabilities,supported_auth_modes,status,version", connectorDefinitionIds),
  ]);

  return {
    generatedAt: new Date().toISOString(), tenant: tenantResult.data,
    organisations: can("tenant.view") ? organisations : [],
    memberships: can("tenant.manage") ? memberships : [],
    partnerAuthorizations: can("partner.approve") || can("tenant.manage") ? partnerAuthorizations : [],
    families: can("product.view") ? families : [], models: can("product.view") ? models : [],
    skus: can("product.view") ? skus : [], batches: can("product.view") ? batches : [],
    batchSkuLinks: can("product.view") ? batchSkuLinks : [], items: can("product.view") ? items : [],
    identifiers: can("product.view") ? identifiers : [],
    dataSources: can("schema.view") ? dataSources : [], sourceRecords: can("schema.view") ? sourceRecords : [],
    mappingProfiles: can("schema.view") ? mappingProfiles : [], mappingVersions: can("schema.view") ? mappingVersions : [],
    mappingRules: can("schema.view") ? mappingRules : [], transformations: can("schema.view") ? transformations : [],
    provenance: can("product.view") ? provenance : [], claims: can("product.view") ? claims : [],
    fields: can("schema.view") ? fields : [], validationRules: can("schema.view") ? validationRules : [],
    accessPolicies: can("schema.view") ? accessPolicies : [],
    passports: can("dpp.view") ? passports : [], reviews: can("dpp.review") || can("dpp.view") ? reviews : [],
    versions: can("dpp.view") ? versions : [], currentPointers: can("dpp.view") ? currentPointers : [],
    resolverMappings: can("dpp.view") ? resolverMappings : [], publicationAudit: can("dpp.view") ? publicationAudit : [],
    connectors: can("connector.view") ? connectors : [], connectorDefinitions: can("connector.view") ? connectorDefinitions : [],
    connectorJobs: can("connector.view") ? connectorJobs : [], connectorAttempts: can("connector.view") ? connectorAttempts : [],
    connectorReceipts: can("connector.read_receipt") ? connectorReceipts : [], deadLetters: can("connector.retry") ? deadLetters : [],
    importSessions: can("connector.view") ? importSessions : [], registrySubmissions: can("registry.view") ? registrySubmissions : [],
    bmsSnapshots: can("connector.view") ? bmsSnapshots : [], connectorAudit: can("connector.view") ? connectorAudit : [],
    policyAudit: can("tenant.manage") || capabilities.has("platform.audit.view") ? policyAudit : [],
  };
}
