import { apiHandler, json, preflight, readJsonObject } from "@/lib/http";
import { resetSlots } from "@/lib/slots";
import { validateResetBody } from "@/lib/validation";

export const POST = apiHandler(async (request) => {
  const body = await readJsonObject(request);
  const validated = validateResetBody(body);
  if (!validated.ok) return json(400, { error: validated.error });
  const count = await resetSlots(validated.value);
  return json(200, { ok: true, slots: count });
});

export const OPTIONS = async () => preflight();
