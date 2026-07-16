import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "weave",
  description: "Learn a language by reading books that slowly change language",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="mx-auto flex max-w-3xl items-center justify-between px-6 pb-2 pt-6">
          <Link href="/" className="font-ui flex items-center gap-2.5 text-sm tracking-[0.25em] text-[var(--ink-soft)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logomark.svg" alt="" width={22} height={22} aria-hidden />
            WEAVE
          </Link>
          <Link href="/library" className="font-ui text-sm text-[var(--ink-soft)]">
            library
          </Link>
        </header>
        <main className="pb-24">{children}</main>
      </body>
    </html>
  );
}
