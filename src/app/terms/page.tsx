import type { Metadata } from "next";
import ProsePage from "@/components/ProsePage";

export const metadata: Metadata = { title: "terms - weave" };

export default function TermsPage() {
  return (
    <ProsePage eyebrow="TERMS" title="Terms of use" updated="July 15, 2026">
      <p>
        weave is a personal reading tool provided as-is, without warranty of
        any kind. Use it at your own discretion; nothing here is professional
        language-instruction advice.
      </p>
      <ul>
        <li>
          Book texts are public-domain works obtained from Project Gutenberg.
          Project Gutenberg is a registered trademark of the Project Gutenberg
          Literary Archive Foundation and is not affiliated with weave.
        </li>
        <li>
          Dictionary data and other third-party materials are used under their
          own licenses - see <a href="/licenses">licenses</a> for the full
          list and required attributions.
        </li>
        <li>
          If you load your own books into weave, you are responsible for
          having the right to use those texts.
        </li>
      </ul>
      <p className="muted">
        weave is a SproulTech project by Nate Sproul.
      </p>
    </ProsePage>
  );
}
