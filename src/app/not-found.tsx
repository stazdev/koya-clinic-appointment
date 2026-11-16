import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg card space-y-3 text-center">
      <h1 className="text-3xl font-bold tracking-tight">We couldn&apos;t find that page</h1>
      <p className="text-muted">The booking or page you are looking for doesn&apos;t exist.</p>
      <Link href="/" className="btn-primary inline-block">
        See available slots
      </Link>
    </div>
  );
}
