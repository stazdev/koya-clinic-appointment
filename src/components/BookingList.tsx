"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { loadMyBookingsAction, type BookingWithSlot, type MyBookingsResult } from "@/app/actions";
import { formatDateTimeRange, useTimeZone } from "@/lib/format";

export function BookingList({ email, initial }: { email: string; initial: MyBookingsResult }) {
  const timeZone = useTimeZone();
  const [bookings, setBookings] = useState<BookingWithSlot[]>("bookings" in initial ? initial.bookings : []);
  const [cursor, setCursor] = useState<string | null>("bookings" in initial ? initial.next_cursor : null);
  const [error, setError] = useState<string | null>("error" in initial ? initial.error : null);
  const [pending, startTransition] = useTransition();

  function loadMore() {
    startTransition(async () => {
      const result = await loadMyBookingsAction(email, cursor);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setError(null);
      setBookings((prev) => [...prev, ...result.bookings]);
      setCursor(result.next_cursor);
    });
  }

  if (bookings.length === 0 && !error) {
    return <p className="text-muted">No bookings found for {email}.</p>;
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {bookings.map((b) => (
          <li key={b.id}>
            <Link href={`/confirmation/${b.id}`} className="flex items-center justify-between gap-4 rounded-3xl bg-tile p-5 transition-colors hover:bg-secondary">
              <div>
                <p className="font-medium">{b.slot?.provider ?? "Unknown provider"}</p>
                <p className="text-sm text-muted">
                  {b.slot ? formatDateTimeRange(b.slot.start, b.slot.end, timeZone) : "Slot no longer available"}
                </p>
              </div>
              <span className={`badge ${b.status === "confirmed" ? "badge-ok" : "badge-muted"}`}>
                {b.status === "confirmed" ? "Confirmed" : "Cancelled"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="alert">
          {error}
        </p>
      )}
      {cursor && (
        <button type="button" onClick={loadMore} disabled={pending} className="btn-secondary w-full">
          {pending ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
