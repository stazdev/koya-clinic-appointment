"use client";

import { useState, useTransition } from "react";
import { cancelBookingAction } from "@/app/actions";

export function CancelBooking({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button type="button" className="btn-secondary w-full" onClick={() => setConfirming(true)}>
        Cancel booking
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl bg-tile p-4">
      <p className="text-sm font-semibold">Cancel this booking? The slot will be released for someone else.</p>
      {error && (
        <p role="alert" className="alert">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          className="btn-danger flex-1"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await cancelBookingAction(id);
              if (result.error) setError(result.error);
            })
          }
        >
          {pending ? "Cancelling…" : "Yes, cancel it"}
        </button>
        <button type="button" className="btn-secondary" disabled={pending} onClick={() => setConfirming(false)}>
          Keep booking
        </button>
      </div>
    </div>
  );
}
