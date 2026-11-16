"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { cancelBooking, createBooking, listBookings, type Booking } from "@/lib/bookings";
import { isError } from "@/lib/result";
import { getSlotsByIds, type Slot } from "@/lib/slots";

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export type BookingFormState = {
  attempt: number;
  error?: string;
  values?: { name: string; email: string };
};

export async function bookSlotAction(prev: BookingFormState, formData: FormData): Promise<BookingFormState> {
  const body = {
    slot_id: field(formData, "slot_id"),
    name: field(formData, "name"),
    email: field(formData, "email"),
  };
  const key = field(formData, "idempotency_key");
  const result = await createBooking(body, key ? `web:${key}` : null);

  if (!isError(result)) redirect(`/confirmation/${(result.body as Booking).id}`);

  let error = result.body.error;
  if (result.status === 409) {
    error = "Sorry, someone has just booked this slot. Please choose another one.";
    refresh();
  } else if (result.status === 429) {
    error = `Too many booking attempts for this email. Please try again in ${result.headers?.["Retry-After"] ?? "a few"} seconds.`;
  } else if (result.status === 404) {
    error = "This slot no longer exists. Please choose another one.";
    refresh();
  } else if (error === "slot has already started") {
    error = "This slot has already started. Please choose a later one.";
    refresh();
  }

  return {
    attempt: prev.attempt + 1,
    error: capitalise(error),
    values: { name: body.name, email: body.email },
  };
}

export async function cancelBookingAction(id: string): Promise<{ error?: string }> {
  const result = await cancelBooking(id);
  refresh();
  if (isError(result)) {
    return { error: result.status === 409 ? "This booking was already cancelled." : "Booking not found." };
  }
  return {};
}

export type BookingWithSlot = Booking & { slot: Slot | null };
export type MyBookingsResult = { error: string } | { bookings: BookingWithSlot[]; next_cursor: string | null };

export async function loadMyBookingsAction(email: string, cursor: string | null): Promise<MyBookingsResult> {
  const result = await listBookings({ email, limit: "10", cursor });
  if (isError(result)) {
    return { error: capitalise(result.body.error) };
  }
  const page = result.body as { bookings: Booking[]; next_cursor: string | null };
  const slots = await getSlotsByIds([...new Set(page.bookings.map((b) => b.slot_id))]);
  return {
    next_cursor: page.next_cursor,
    bookings: page.bookings.map((b) => {
      const slot = slots.get(b.slot_id);
      return { ...b, slot: slot ? { id: slot.id, provider: slot.provider, start: slot.start, end: slot.end } : null };
    }),
  };
}
