import { NextResponse } from "next/server";
import { requestLogFields, writeLog } from "./logger";
import { CORRELATION_ID_HEADER, createRequestContext, type RequestContext } from "./requestContext";

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

export function withApiRoute<RouteContext = unknown>(handler: ApiHandler<RouteContext>): (request: Request, routeContext: RouteContext) => Promise<Response> {
  return async (request: Request, routeContext: RouteContext) => {
    const context = createRequestContext(request);
    try {
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
