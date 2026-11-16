CREATE TABLE IF NOT EXISTS slots (
  id         text PRIMARY KEY,
  provider   text NOT NULL,
  start_raw  text NOT NULL,
  end_raw    text NOT NULL,
  start_at   timestamptz NOT NULL,
  end_at     timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS slots_start_idx ON slots (start_at, id);
CREATE INDEX IF NOT EXISTS slots_provider_idx ON slots (provider);

CREATE TABLE IF NOT EXISTS bookings (
  seq        bigserial UNIQUE,
  id         text PRIMARY KEY,
  slot_id    text NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  name       text NOT NULL,
  email      text NOT NULL,
  status     text NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_confirmed_booking_per_slot
  ON bookings (slot_id) WHERE status = 'confirmed';
CREATE INDEX IF NOT EXISTS bookings_email_seq_idx ON bookings (email, seq);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key         text PRIMARY KEY,
  body_hash   text NOT NULL,
  status_code int  NOT NULL,
  response    jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS booking_attempts (
  id    bigserial PRIMARY KEY,
  email text NOT NULL,
  at    timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS booking_attempts_email_at_idx ON booking_attempts (email, at);
