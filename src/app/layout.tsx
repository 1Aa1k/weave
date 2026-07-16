import type { Metadata } from "next";
import Link from "next/link";
import { totalDue } from "@/lib/srs";
import "./globals.css";

export const metadata: Metadata = {
  title: "weave",
  description: "Learn a language by reading books that slowly change language",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const due = totalDue();
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="mx-auto flex max-w-[1400px] items-center justify-between px-6 pb-2 pt-6 md:px-12">
          <Link href="/" className="font-ui flex items-center gap-2.5 text-sm tracking-[0.25em] text-[var(--ink-soft)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logomark.svg" alt="" width={22} height={22} aria-hidden />
            WEAVE
          </Link>
          <Link href="/library" className="font-ui flex items-center gap-2 text-sm text-[var(--ink-soft)]">
            library
            {due > 0 && (
              <span className="rounded bg-[var(--indigo-soft)] px-2 py-0.5 text-xs text-[var(--indigo)]">
                {due} due
              </span>
            )}
          </Link>
        </header>
        <main className="pb-24">{children}</main>
      </body>
    </html>
  );
}
