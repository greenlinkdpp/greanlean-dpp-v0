export const CORRELATION_ID_HEADER = "x-correlation-id";

export type RequestContext = {
  correlationId: string;
  method: string;
  path: string;
  startedAt: number;
};

const SAFE_CORRELATION_ID = /^[A-Za-z0-9._:-]{1,128}$/;

export function createRequestContext(request: Request): RequestContext {
  const supplied = request.headers.get(CORRELATION_ID_HEADER)?.trim() || "";
  const url = new URL(request.url);
  return {
    correlationId: SAFE_CORRELATION_ID.test(supplied) ? supplied : crypto.randomUUID(),
    method: request.method,
    path: url.pathname,
    startedAt: Date.now(),
  };
}
