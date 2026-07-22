import type { RequestContext } from "./requestContext";

type LogLevel = "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

const SENSITIVE_KEY = /authorization|cookie|password|secret|token|service.?role|api.?key/i;

export function redactLogValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[MAX_DEPTH]";
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactLogValue(item, depth + 1));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactLogValue(item, depth + 1),
      ]),
    );
  }
  return value;
}

export function writeLog(level: LogLevel, event: string, fields: LogFields = {}) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...redactLogValue(fields) as LogFields,
  });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export function requestLogFields(context: RequestContext) {
  return {
    correlation_id: context.correlationId,
    method: context.method,
    path: context.path,
    duration_ms: Date.now() - context.startedAt,
  };
}
