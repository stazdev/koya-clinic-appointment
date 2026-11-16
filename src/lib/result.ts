export type ApiResult<T = unknown> = {
  status: number;
  body: T | { error: string };
  headers?: Record<string, string>;
};

export function ok<T>(body: T, status = 200): ApiResult<T> {
  return { status, body };
}

export function fail(status: number, error: string, headers?: Record<string, string>): ApiResult<never> {
  return { status, body: { error }, headers };
}

export function isError(result: ApiResult): result is ApiResult<never> & { body: { error: string } } {
  return result.status >= 400;
}
