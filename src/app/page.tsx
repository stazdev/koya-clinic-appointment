import Link from "next/link";
import { Suspense } from "react";
import { SlotBrowser } from "@/components/SlotBrowser";
import { listProviders, listSlots } from "@/lib/slots";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Book an appointment</h1>
        <p className="text-muted">Pick a time that suits you, then enter your details.</p>
      </div>
      <Suspense fallback={<p className="text-muted">Loading available slots…</p>}>
        <Slots searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Slots({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const { provider: rawProvider } = await searchParams;
  const provider = typeof rawProvider === "string" && rawProvider !== "" ? rawProvider : null;
  const [slots, providers] = await Promise.all([listSlots(provider), listProviders()]);

  return (
    <>
      {providers.length > 1 && (
        <nav aria-label="Filter by provider" className="mb-6 flex flex-wrap gap-2">
          <Link href="/" className={`chip ${provider === null ? "chip-active" : ""}`}>
            All providers
          </Link>
          {providers.map((p) => (
            <Link
              key={p}
              href={`/?provider=${encodeURIComponent(p)}`}
              className={`chip ${provider === p ? "chip-active" : ""}`}
            >
              {p}
            </Link>
          ))}
        </nav>
      )}
      <SlotBrowser slots={slots} />
    </>
  );
}
