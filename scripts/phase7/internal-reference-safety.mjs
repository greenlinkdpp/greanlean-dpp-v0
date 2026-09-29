export function validateManagedBackupEvidence(backup, { expectedProjectRef, nowMs = Date.now() }) {
  const completedAtMs = Date.parse(backup?.completedAt);
  const ageMs = nowMs - completedAtMs;
  if (backup?.projectRef !== expectedProjectRef) throw new Error("FRESH_BACKUP_GATE = FAIL: backup project does not match Production.");
  if (String(backup?.status).toUpperCase() !== "COMPLETED") throw new Error("FRESH_BACKUP_GATE = FAIL: backup is not completed.");
  if (!Number.isFinite(completedAtMs) || ageMs < 0 || ageMs > 24 * 60 * 60 * 1000) throw new Error("FRESH_BACKUP_GATE = FAIL: backup is invalid, future-dated, or older than 24 hours.");
  if (!backup?.reference) throw new Error("FRESH_BACKUP_GATE = FAIL: backup reference is missing.");
  return { reference: backup.reference, completedAt: new Date(completedAtMs).toISOString(), ageMs };
}

export function assertNoExternalNaturalKeyCollisions(collisionRows, referenceTenantId) {
  for (const [kind, rows] of Object.entries(collisionRows)) {
    if (rows.some((row) => !referenceTenantId || row.tenant_id !== referenceTenantId)) throw new Error(`REFUSED: external ${kind} collision found.`);
  }
  return true;
}

export function netMutationPlan(expected, current) {
  const result = {};
  for (const [key, value] of Object.entries(expected)) {
    if ((current[key] ?? 0) > value) throw new Error(`UNEXPECTED_REFERENCE_STATE: ${key} exceeds the approved topology.`);
    result[key] = Math.max(0, value - (current[key] ?? 0));
  }
  return result;
}
