"use client";

import { useActionState, useState } from "react";
import { bookSlotAction, type BookingFormState } from "@/app/actions";
import type { SlotView } from "@/lib/slots";
import { formatDateTimeRange, useTimeZone } from "@/lib/format";

const initialState: BookingFormState = { attempt: 0 };

export function BookingForm({ slot, onClose }: { slot: SlotView; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(bookSlotAction, initialState);
  const [formId] = useState(() => crypto.randomUUID());
  const timeZone = useTimeZone();

  return (
    <form action={formAction} className="space-y-4" aria-describedby={state.error ? "booking-error" : undefined}>
      <div>
        <p className="text-sm text-muted">You are booking</p>
        <p className="font-semibold">{slot.provider}</p>
        <p className="text-sm">{formatDateTimeRange(slot.start, slot.end, timeZone)}</p>
      </div>

      <input type="hidden" name="slot_id" value={slot.id} />
      <input type="hidden" name="idempotency_key" value={`${formId}:${state.attempt}`} />

      <label className="block">
        <span className="text-sm font-medium">Full name</span>
        <input
          name="name"
          required
          autoComplete="name"
          defaultValue={state.values?.name}
          className="field"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.values?.email}
          className="field"
        />
      </label>

      {state.error && (
        <p id="booking-error" role="alert" className="alert">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="btn-primary flex-1">
          {pending ? "Booking…" : "Confirm booking"}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
