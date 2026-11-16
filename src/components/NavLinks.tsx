"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

const LINKS = [
  { href: "/", label: "Book" },
  { href: "/my-bookings", label: "My bookings" },
];

function Links({ pathname }: { pathname: string | null }) {
  return (
    <div className="flex gap-2">
      {LINKS.map(({ href, label }) => {
        const active = pathname !== null && (href === "/" ? pathname === "/" : pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`chip ${active ? "chip-active" : "bg-transparent"}`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

function ActiveLinks() {
  return <Links pathname={usePathname()} />;
}

export function NavLinks() {
  return (
    <Suspense fallback={<Links pathname={null} />}>
      <ActiveLinks />
    </Suspense>
  );
}
