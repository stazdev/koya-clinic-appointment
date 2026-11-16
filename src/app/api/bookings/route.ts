import { createBooking, listBookings } from "@/lib/bookings";
import { apiHandler, preflight, readJsonObject, respond } from "@/lib/http";

export const POST = apiHandler(async (request) => {
  const body = await readJsonObject(request);
  const key = request.headers.get("idempotency-key")?.trim() || null;
  return respond(await createBooking(body, key));
});

export const GET = apiHandler(async (request) => {
  const params = new URL(request.url).searchParams;
  return respond(
    await listBookings({
      email: params.get("email"),
      limit: params.get("limit"),
      cursor: params.get("cursor"),
    }),
  );
});

export const OPTIONS = async () => preflight();
