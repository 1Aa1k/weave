import Link from "next/link";

interface ProsePageProps {
  eyebrow: string;
  title: string;
  updated?: string;
  children: React.ReactNode;
}

/** Shared shell for about/contact/legal pages: quiet, measured, in-system. */
export default function ProsePage({ eyebrow, title, updated, children }: ProsePageProps) {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-12">
      <p className="font-ui text-xs tracking-[0.3em] text-[var(--ink-soft)]">{eyebrow}</p>
      <h1 className="mt-4 text-4xl">{title}</h1>
      {updated && (
        <p className="font-ui mt-2 text-xs text-[var(--ink-soft)]">last updated {updated}</p>
      )}
      <div className="prose-body mt-10">{children}</div>
      <p className="font-ui mt-16 border-t border-[var(--line)] pt-6 text-sm">
        <Link href="/" className="text-[var(--indigo)]">
          back to weave
        </Link>
      </p>
    </div>
  );
}
