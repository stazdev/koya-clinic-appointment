import { cancelBooking, getBooking } from "@/lib/bookings";
import { apiHandler, json, preflight, respond } from "@/lib/http";

type Context = RouteContext<"/api/bookings/[id]">;

export const GET = apiHandler<Context>(async (_request, { params }) => {
  const { id } = await params;
  const booking = await getBooking(id);
  return booking ? json(200, booking) : json(404, { error: "booking not found" });
});

export const DELETE = apiHandler<Context>(async (_request, { params }) => {
  const { id } = await params;
  return respond(await cancelBooking(id));
});

export const OPTIONS = async () => preflight();
