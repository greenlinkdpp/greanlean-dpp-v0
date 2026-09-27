import { ApiError } from "../apiRoute";
import { assertSafeResponse, redactExternalResult, safeFingerprint, validateConnectorUrl, type ConnectorUrlPolicy } from "../../v2/connectorSecurity";

export type RestConnectorRequest = {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  maximumBytes?: number;
};

export async function executeGenericRest(request: RestConnectorRequest, policy: ConnectorUrlPolicy) {
  const timeoutMs = Math.min(Math.max(request.timeoutMs ?? 10_000, 100), 30_000);
  const maximumBytes = Math.min(Math.max(request.maximumBytes ?? 1_048_576, 1024), 5_242_880);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    let current = await validateConnectorUrl(request.url, policy);
    for (let redirect = 0; redirect <= 2; redirect += 1) {
      const response = await fetch(current, {
        method: request.method,
        headers: { accept: "application/json, text/csv, text/plain", ...(request.body === undefined ? {} : { "content-type": "application/json" }), ...request.headers },
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
        redirect: "manual",
        signal: controller.signal,
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location || redirect === 2) throw new ApiError(502, "CONNECTOR_HOST_NOT_ALLOWED", "The external redirect was rejected.");
        current = await validateConnectorUrl(new URL(location, current).toString(), policy);
        continue;
      }
      const declared = Number(response.headers.get("content-length") || 0);
      assertSafeResponse(response.headers.get("content-type"), declared, maximumBytes);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > maximumBytes) throw new ApiError(502, "CONNECTOR_EXTERNAL_ERROR", "The external response exceeded the configured limit.");
      const text = new TextDecoder().decode(bytes);
      let value: unknown = text;
      if (response.headers.get("content-type")?.toLowerCase().includes("json")) {
        try { value = JSON.parse(text); } catch { throw new ApiError(502, "CONNECTOR_EXTERNAL_ERROR", "The external response was malformed."); }
      }
      return {
        httpStatus: response.status,
        requestFingerprint: safeFingerprint(`${request.method}:${current}:${request.body === undefined ? "" : JSON.stringify(request.body)}`),
        responseFingerprint: safeFingerprint(bytes),
        latencyMs: Date.now() - started,
        result: redactExternalResult(value),
      };
    }
    throw new ApiError(502, "CONNECTOR_EXTERNAL_ERROR", "The external request did not complete.");
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw new ApiError(504, "CONNECTOR_TIMEOUT", "The external request timed out.");
    if (error instanceof ApiError) throw error;
    const code = String((error as Error)?.message || "");
    if (code === "CONNECTOR_HOST_NOT_ALLOWED") throw new ApiError(400, code, "The external host is not permitted.");
    throw new ApiError(502, "CONNECTOR_EXTERNAL_ERROR", "The external request failed.");
  } finally {
    clearTimeout(timeout);
  }
}
