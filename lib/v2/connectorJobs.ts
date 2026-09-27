export type RetryProfile = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMode: "EXPONENTIAL" | "FIXED";
  retryableStatuses?: number[];
  retryableErrorClasses?: string[];
};

export type AttemptOutcome = { status?: number; errorClass?: string; timedOut?: boolean };

export function classifyRetry(outcome: AttemptOutcome) {
  if (outcome.timedOut) return { retryable: true, code: "CONNECTOR_TIMEOUT" };
  if (outcome.status === 429) return { retryable: true, code: "CONNECTOR_RATE_LIMITED" };
  if (outcome.status && outcome.status >= 500) return { retryable: true, code: "CONNECTOR_EXTERNAL_ERROR" };
  if (outcome.status === 401 || outcome.status === 403) return { retryable: false, code: "CONNECTOR_CREDENTIAL_INVALID" };
  if (outcome.status && outcome.status >= 400) return { retryable: false, code: "CONNECTOR_EXTERNAL_ERROR" };
  return { retryable: false, code: null };
}

export function retryDecision(attemptNumber: number, profile: RetryProfile, outcome: AttemptOutcome) {
  if (!Number.isInteger(profile.maxAttempts) || profile.maxAttempts < 1 || profile.maxAttempts > 10) throw new Error("CONNECTOR_CONFIG_INVALID");
  const classification = classifyRetry(outcome);
  if (!classification.retryable) return { ...classification, state: "FAILED" as const, delayMs: 0 };
  if (attemptNumber >= profile.maxAttempts) return { ...classification, state: "DEAD_LETTER" as const, delayMs: 0 };
  const factor = profile.backoffMode === "EXPONENTIAL" ? 2 ** Math.max(0, attemptNumber - 1) : 1;
  return {
    ...classification,
    state: "RETRY_WAIT" as const,
    delayMs: Math.min(profile.maxDelayMs, profile.baseDelayMs * factor),
  };
}

export function canCancelJob(status: string) {
  return status === "QUEUED" || status === "RETRY_WAIT";
}

export type CircuitState = { state: "CLOSED" | "OPEN" | "HALF_OPEN"; failures: number; openedAt?: number };

export function transitionCircuit(current: CircuitState, success: boolean, now = Date.now(), threshold = 5, resetAfterMs = 60_000): CircuitState {
  if (success) return { state: "CLOSED", failures: 0 };
  if (current.state === "OPEN" && current.openedAt && now - current.openedAt >= resetAfterMs) return { state: "HALF_OPEN", failures: current.failures };
  const failures = current.failures + 1;
  return failures >= threshold ? { state: "OPEN", failures, openedAt: now } : { state: current.state, failures };
}

