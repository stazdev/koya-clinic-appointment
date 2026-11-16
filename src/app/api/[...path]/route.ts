import { apiHandler, json, preflight } from "@/lib/http";

const notFound = apiHandler(async () => json(404, { error: "not found" }));

export { notFound as GET, notFound as POST, notFound as PUT, notFound as PATCH, notFound as DELETE };

export const OPTIONS = async () => preflight();
