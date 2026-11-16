# Clinic Booking API

A clinic booking API with a simple web page that uses it. Built for Task 1 of the Koya Cohort 4 assessment.

- **Live URL:** https://koya-clinic-appointment.vercel.app
- **Contract:** [openapi.json](https://koyaacademy.com/assessment-api/openapi.json)
- **Stack:** Next.js 16 (App Router, TypeScript), Postgres (Neon in production), `pg`, Tailwind CSS, Vitest

## Endpoints

Every request needs an `X-API-Key` header. The endpoints are served at the root (`/slots`) and under `/api` (`/api/slots`).

| Method | Path | Purpose |
|---|---|---|
| POST | `/reset` | Replace all slots and delete every booking |
| GET | `/slots?provider=` | List slots, earliest first, with availability |
| POST | `/bookings` | Book a slot (optional `Idempotency-Key` header) |
| GET | `/bookings/{id}` | Get one booking |
| DELETE | `/bookings/{id}` | Cancel a booking |
| GET | `/bookings?email=&limit=&cursor=` | A person's bookings, oldest first, cursor-paginated |

The web page:

- `/` shows the slots and a booking form.
- `/confirmation/{id}` shows a booking and lets you cancel it.
- `/my-bookings` lists a person's bookings.

## Running locally

```bash
npm install
cp .env.example .env.local     # set DATABASE_URL and API_KEY
npm run db:migrate             # create tables
npm run dev
npm run seed                   # optional: load sample future slots (calls /reset)
```

## Tests

The tests send real HTTP requests to a running server, so the same suite checks local and deployed builds. They call `/reset`, which deletes all data on that server.

```bash
API_BASE_URL=http://localhost:3000 npm test
```

They refuse to run against a non-local URL unless `ALLOW_PROD_TESTS=1` is set.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string (Neon pooled URL in production) |
| `API_KEY` | The key clients must send as `X-API-Key` |
| `API_BASE_URL` | Tests and seed script only; defaults to `http://localhost:3000` |

## Design decisions

- **No double booking.** A partial unique index (`one_confirmed_booking_per_slot`) allows only one confirmed booking per slot. Postgres enforces it under any concurrency, and a violation returns 409.
- **Idempotency.** A transaction-scoped advisory lock serialises requests that share an `Idempotency-Key`. The first request's status and body are stored and replayed. The same key with a different body (compared as canonical JSON) returns 422.
- **Rate limiting.** At most 5 attempts per email in a sliding 60-second window, counted in Postgres under a per-email advisory lock. Failed attempts count. Rejected (429) attempts don't, so waiting `Retry-After` seconds always works. Replays of an already-stored idempotent response don't count either, so a client can safely retry.
- **Order in `POST /bookings`:** auth → JSON → idempotency replay → rate limit → validation → slot checks → insert, all in one transaction.
- **Timestamps are echoed exactly.** Slot `start`/`end` are stored as the original strings as well as parsed `timestamptz`.
- **Pagination.** The cursor is an opaque base64url of the booking's insertion sequence, so ordering is stable and has no ties.
- **The web page never sees the API key.** It uses server actions that call the same library code as the API, so behaviour is identical.
- **All state lives in Postgres**, because serverless instances share no memory.
