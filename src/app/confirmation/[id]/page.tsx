import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookingDetails } from "@/components/BookingDetails";
import { CancelBooking } from "@/components/CancelBooking";
import { getBooking } from "@/lib/bookings";
import { getSlotsByIds } from "@/lib/slots";

export default function ConfirmationPage({ params }: PageProps<"/confirmation/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading your booking…</p>}>
      <Confirmation params={params} />
    </Suspense>
  );
}

async function Confirmation({ params }: { params: PageProps<"/confirmation/[id]">["params"] }) {
  const { id } = await params;
  const booking = await getBooking(id);
  if (!booking) notFound();
  const slot = (await getSlotsByIds([booking.slot_id])).get(booking.slot_id) ?? null;
  const confirmed = booking.status === "confirmed";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="card space-y-4">
        <div>
          <span className={`badge ${confirmed ? "badge-ok" : "badge-muted"}`}>
            {confirmed ? "Confirmed" : "Cancelled"}
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {confirmed ? "Your booking is confirmed" : "This booking has been cancelled"}
          </h1>
        </div>
        <BookingDetails booking={booking} slot={slot} />
        {confirmed && <CancelBooking id={booking.id} />}
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/" className="link">
          Book another appointment
        </Link>
        <Link href={`/my-bookings?email=${encodeURIComponent(booking.email)}`} className="link">
          See all my bookings
        </Link>
      </div>
    </div>
  );
}
