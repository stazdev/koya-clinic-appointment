import { Suspense } from "react";
import { loadMyBookingsAction } from "@/app/actions";
import { BookingList } from "@/components/BookingList";

type SearchParams = PageProps<"/my-bookings">["searchParams"];

export default function MyBookingsPage({ searchParams }: PageProps<"/my-bookings">) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My bookings</h1>
        <p className="text-muted">Enter the email you booked with to see your appointments.</p>
      </div>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: SearchParams }) {
  const { email: raw } = await searchParams;
  const email = typeof raw === "string" ? raw.trim() : "";
  const initial = email ? await loadMyBookingsAction(email, null) : null;

  return (
    <>
      <form method="get" className="card flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block flex-1">
          <span className="text-sm font-medium">Email</span>
          <input name="email" type="email" required defaultValue={email} autoComplete="email" className="field" />
        </label>
        <button type="submit" className="btn-primary">
          Show bookings
        </button>
      </form>
      {initial && <BookingList key={email} email={email} initial={initial} />}
    </>
  );
}
