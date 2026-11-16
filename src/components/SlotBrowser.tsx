"use client";

import { useEffect, useRef, useState } from "react";
import type { SlotView } from "@/lib/slots";
import { dayKey, formatDay, formatRange, useTimeZone } from "@/lib/format";
import { BookingForm } from "./BookingForm";

function groupByDay(slots: SlotView[], timeZone: string) {
  const groups = new Map<string, SlotView[]>();
  for (const slot of slots) {
    const key = dayKey(slot.start, timeZone);
    groups.set(key, [...(groups.get(key) ?? []), slot]);
  }
  return [...groups.values()];
}

function slotLabel(slot: SlotView) {
  if (slot.started) return "Past";
  if (!slot.available) return "Booked";
  return "Available";
}

export function SlotBrowser({ slots }: { slots: SlotView[] }) {
  const timeZone = useTimeZone();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selected = slots.find((s) => s.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected]);

  if (slots.length === 0) {
    return <p className="card text-muted">No appointment slots are available right now. Please check back later.</p>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <p className="text-xs text-muted">Times shown in {timeZone}.</p>
        {groupByDay(slots, timeZone).map((day) => (
          <section key={day[0].id} aria-labelledby={`day-${day[0].id}`}>
            <h2 id={`day-${day[0].id}`} className="mb-3 text-lg font-bold">
              {formatDay(day[0].start, timeZone)}
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {day.map((slot) => {
                const bookable = slot.available && !slot.started;
                const isSelected = slot.id === selected?.id;
                return (
                  <li key={slot.id}>
                    <button
                      type="button"
                      disabled={!bookable}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedId(slot.id)}
                      className={`slot ${isSelected ? "slot-selected" : ""}`}
                    >
                      <span className="font-medium">{formatRange(slot.start, slot.end, timeZone)}</span>
                      <span className="text-sm">{slot.provider}</span>
                      <span className={`badge ${bookable ? "badge-ok" : "badge-muted"}`}>{slotLabel(slot)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div ref={panelRef} className="md:sticky md:top-6 md:self-start">
        <div className="card">
          {selected ? (
            <BookingForm key={selected.id} slot={selected} onClose={() => setSelectedId(null)} />
          ) : (
            <p className="text-sm text-muted">Choose an available slot to book it.</p>
          )}
        </div>
      </div>
    </div>
  );
}
