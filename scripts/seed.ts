import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

const BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const API_KEY = process.env.API_KEY;

const PROVIDERS = ["Dr Ade", "Dr Bello", "Dr Chukwu"];
const DAYS = 5;
const TIMES_UTC = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "13:00", "13:30", "14:00"];

function buildSlots() {
  const slots: { id: string; provider: string; start: string; end: string }[] = [];
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  let added = 0;
  while (added < DAYS) {
    day.setUTCDate(day.getUTCDate() + 1);
    if (day.getUTCDay() === 0 || day.getUTCDay() === 6) continue;
    added++;
    const date = day.toISOString().slice(0, 10);
    PROVIDERS.forEach((provider, p) => {
      TIMES_UTC.filter((_, i) => (i + p) % 3 !== 0).forEach((time) => {
        const start = new Date(`${date}T${time}:00Z`);
        const end = new Date(start.getTime() + 30 * 60_000);
        slots.push({
          id: `${date}-${p + 1}-${time.replace(":", "")}`,
          provider,
          start: start.toISOString().replace(".000Z", "Z"),
          end: end.toISOString().replace(".000Z", "Z"),
        });
      });
    });
  }
  return slots;
}

async function main() {
  if (!API_KEY) throw new Error("API_KEY is not set");
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE_URL);
  if (!isLocal && !process.argv.includes("--force")) {
    throw new Error(`Seeding ${BASE_URL} deletes every booking there. Re-run with --force to continue.`);
  }
  const slots = buildSlots();
  const res = await fetch(`${BASE_URL}/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
    body: JSON.stringify({ slots }),
  });
  console.log(res.status, await res.text());
  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
