import { apiHandler, json, preflight } from "@/lib/http";
import { listSlots, toPublicSlot } from "@/lib/slots";

export const GET = apiHandler(async (request) => {
  const provider = new URL(request.url).searchParams.get("provider");
  const slots = await listSlots(provider);
  return json(200, { slots: slots.map(toPublicSlot) });
});

export const OPTIONS = async () => preflight();
