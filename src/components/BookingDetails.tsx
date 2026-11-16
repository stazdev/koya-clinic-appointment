"use client";

import type { Booking } from "@/lib/bookings";
import type { Slot } from "@/lib/slots";
import { formatDateTimeRange, useTimeZone } from "@/lib/format";

export function BookingDetails({ booking, slot }: { booking: Booking; slot: Slot | null }) {
  const timeZone = useTimeZone();
  const rows: [string, string][] = [
    ["Reference", booking.id],
    ["Provider", slot?.provider ?? "—"],
    ["Time", slot ? formatDateTimeRange(slot.start, slot.end, timeZone) : "—"],
    ["Name", booking.name],
    ["Email", booking.email],
  ];

  return (
    <dl className="space-y-1 rounded-2xl bg-tile p-4 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[6rem_1fr] gap-2 py-1">
          <dt className="text-muted">{label}</dt>
          <dd className="break-all">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
