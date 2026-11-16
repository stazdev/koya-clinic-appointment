import { randomUUID } from "node:crypto";

export const BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const API_KEY = process.env.API_KEY ?? "";

type Options = {
  method?: string;
  body?: unknown;
  rawBody?: string;
  headers?: Record<string, string>;
  apiKey?: string | null;
};

export type ApiResponse<T = any> = { status: number; body: T; headers: Headers };

export async function api<T = any>(path: string, options: Options = {}): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { ...options.headers };
  const key = options.apiKey === undefined ? API_KEY : options.apiKey;
  if (key !== null) headers["X-API-Key"] = key;
  let body: string | undefined = options.rawBody;
  if (options.body !== undefined) body = JSON.stringify(options.body);
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE_URL}${path}`, { method: options.method ?? "GET", headers, body });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
}

export type TestSlot = { id: string; provider: string; start: string; end: string };

export function futureSlot(id: string, hoursAhead: number, provider = "Dr Ade"): TestSlot {
  const start = new Date(Date.now() + hoursAhead * 3_600_000);
  start.setUTCSeconds(0, 0);
  const end = new Date(start.getTime() + 30 * 60_000);
  return { id, provider, start: start.toISOString().replace(".000Z", "Z"), end: end.toISOString().replace(".000Z", "Z") };
}

export function pastSlot(id: string, provider = "Dr Ade"): TestSlot {
  return futureSlot(id, -48, provider);
}

export async function reset(slots: TestSlot[]) {
  const res = await api("/reset", { method: "POST", body: { slots } });
  if (res.status !== 200) throw new Error(`reset failed: ${res.status} ${JSON.stringify(res.body)}`);
}

export function uniqueEmail(prefix = "user") {
  return `${prefix}-${randomUUID().slice(0, 8)}@example.com`;
}

export function book(body: Record<string, unknown>, headers?: Record<string, string>) {
  return api("/bookings", { method: "POST", body, headers });
}
