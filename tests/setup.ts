import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const base = process.env.API_BASE_URL ?? "http://localhost:3000";
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(base);
if (!isLocal && process.env.ALLOW_PROD_TESTS !== "1") {
  throw new Error(`Tests call /reset and would wipe ${base}. Set ALLOW_PROD_TESTS=1 to run against it.`);
}
