import { isValidApiKey } from "./auth";
import type { ApiResult } from "./result";
import { isPlainObject } from "./validation";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "X-API-Key, Idempotency-Key, Content-Type",
  "Access-Control-Expose-Headers": "Retry-After",
};

export function json(status: number, body: unknown, headers?: Record<string, string>): Response {
  return Response.json(body, {
    status,
    headers: { ...CORS_HEADERS, "Cache-Control": "no-store", ...headers },
  });
}

export function respond(result: ApiResult): Response {
  return json(result.status, result.body, result.headers);
}

export function preflight(): Response {
  return new Response(null, { status: 204, headers: { ...CORS_HEADERS, "Access-Control-Max-Age": "86400" } });
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    throw new HttpError(400, "invalid JSON body");
  }
  if (!isPlainObject(body)) throw new HttpError(400, "invalid JSON body");
  return body;
}

type Handler<C> = (request: Request, context: C) => Promise<Response>;

export function apiHandler<C>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    if (!isValidApiKey(request.headers.get("x-api-key"))) {
      return json(401, { error: "invalid or missing API key" });
    }
    try {
      return await handler(request, context);
    } catch (err) {
      if (err instanceof HttpError) return json(err.status, { error: err.message });
      console.error(err);
      return json(500, { error: "internal error" });
    }
  };
}
