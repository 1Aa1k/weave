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
        <header className="mx-auto flex max-w-3xl items-baseline justify-between px-6 pb-2 pt-6">
          <Link href="/" className="font-ui text-sm tracking-[0.25em] text-[var(--ink-soft)]">
            WEAVE <span className="jp text-[var(--indigo)]">織</span>
          </Link>
        </header>
        <main className="mx-auto max-w-3xl px-6 pb-24">{children}</main>
      </body>
    </html>
  );
}
