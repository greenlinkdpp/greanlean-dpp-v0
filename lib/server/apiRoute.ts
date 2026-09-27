import { NextResponse } from "next/server";
import { requestLogFields, writeLog } from "./logger";
import { CORRELATION_ID_HEADER, createRequestContext, type RequestContext } from "./requestContext";
import { requestBodyLimit } from "./publicControls";

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    correlation_id: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiHandler<RouteContext> = (request: Request, context: RequestContext, routeContext: RouteContext) => Promise<Response> | Response;

type FrameworkRouteContext<RouteContext> = RouteContext extends { params: infer Params }
  ? Omit<RouteContext, "params"> & { params: Promise<Params> }
  : RouteContext;

async function enforceRequestBodyCapacity(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return;
  const maximumBytes = requestBodyLimit(new URL(request.url).pathname, request.headers.get("content-type") || "");
  if (maximumBytes === null) return;
  const declaredBytes = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredBytes) && declaredBytes > maximumBytes) {
    throw new ApiError(413, "REQUEST_BODY_TOO_LARGE", "The request body exceeds the route capacity limit.");
  }
  const reader = request.clone().body?.getReader();
  if (!reader) return;
  let received = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    received += chunk.value.byteLength;
    if (received > maximumBytes) {
      await reader.cancel();
      throw new ApiError(413, "REQUEST_BODY_TOO_LARGE", "The request body exceeds the route capacity limit.");
    }
  }
}

function errorResponse(error: unknown, context: RequestContext) {
  const known = error instanceof ApiError;
  const status = known ? error.status : 500;
  const code = known ? error.code : "INTERNAL_ERROR";
  const message = known ? error.message : "The request could not be completed.";
  const body: ApiErrorBody = {
    error: {
      code,
      message,
      correlation_id: context.correlationId,
      ...(known && error.details !== undefined ? { details: error.details } : {}),
    },
  };

  writeLog("error", "api.request.failed", {
    ...requestLogFields(context),
    status,
    error_code: code,
    ...(known && error.details !== undefined
      ? { error_details: error.details }
      : {}),
    error,
  });
  return NextResponse.json(body, {
    status,
    headers: { [CORRELATION_ID_HEADER]: context.correlationId, "Cache-Control": "no-store" },
  });
}

export function withApiRoute<RouteContext = unknown>(handler: ApiHandler<RouteContext>): (request: Request, routeContext: FrameworkRouteContext<RouteContext>) => Promise<Response> {
  return async (request: Request, frameworkRouteContext: FrameworkRouteContext<RouteContext>) => {
    const context = createRequestContext(request);
    try {
      await enforceRequestBodyCapacity(request);
      // Next.js 15 resolves dynamic route parameters asynchronously. Keep the
      // application's handler contract synchronous so the upgrade is isolated
      // to this trusted boundary instead of leaking framework details into all
      // route modules.
      const routeContext = frameworkRouteContext && typeof frameworkRouteContext === "object" && "params" in frameworkRouteContext
        ? { ...frameworkRouteContext, params: await frameworkRouteContext.params } as RouteContext
        : frameworkRouteContext as RouteContext;
      const response = await handler(request, context, routeContext);
      response.headers.set(CORRELATION_ID_HEADER, context.correlationId);
      writeLog("info", "api.request.completed", {
        ...requestLogFields(context),
        status: response.status,
      });
      return response;
    } catch (error) {
      return errorResponse(error, context);
    }
  };
}
