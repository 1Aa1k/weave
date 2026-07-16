import type { Metadata } from "next";
import ProsePage from "@/components/ProsePage";

export const metadata: Metadata = { title: "privacy - weave" };

export default function PrivacyPage() {
  return (
    <ProsePage eyebrow="PRIVACY" title="Your reading stays on your machine" updated="July 15, 2026">
      <p>
        weave currently runs entirely on your own computer. There are no
        accounts, no analytics, no advertising, no tracking pixels, and no
        cookies beyond what the framework needs to serve pages.
      </p>
      <h2>What is stored, and where</h2>
      <ul>
        <li>
          Your reading progress, flashcard review history, and word taps are
          stored in a single SQLite database file (<code>data/weave.db</code>)
          on your machine.
        </li>
        <li>Nothing is transmitted to any server. The app works offline.</li>
        <li>
          Deleting that one file erases everything weave knows about you.
        </li>
      </ul>
      <h2>If weave ever becomes a hosted service</h2>
      <p>
        This policy describes the local, single-user version. A hosted version
        would need - and would get - a real policy covering whatever it
        actually collects, before it collects anything.
      </p>
    </ProsePage>
  );
}
