import type { Metadata } from "next";
import ProsePage from "@/components/ProsePage";

export const metadata: Metadata = { title: "licenses - weave" };

export default function LicensesPage() {
  return (
    <ProsePage eyebrow="LICENSES" title="Attributions" updated="July 15, 2026">
      <p>weave is built on generously licensed work:</p>
      <h2>Dictionary</h2>
      <p>
        Japanese definitions come from{" "}
        <a href="https://www.edrdg.org/jmdict/j_jmdict.html">JMdict</a>, the
        property of the Electronic Dictionary Research and Development Group
        (EDRDG), used under the group&apos;s{" "}
        <a href="https://www.edrdg.org/edrdg/licence.html">license</a>{" "}
        (Creative Commons Attribution-ShareAlike 4.0). weave uses the JSON
        conversion from the{" "}
        <a href="https://github.com/scriptin/jmdict-simplified">
          jmdict-simplified
        </a>{" "}
        project.
      </p>
      <h2>Word frequency</h2>
      <p>
        English word-frequency ranks come from{" "}
        <a href="https://github.com/hermitdave/FrequencyWords">
          FrequencyWords
        </a>{" "}
        (derived from the OpenSubtitles corpus), used under Creative Commons
        Attribution-ShareAlike 4.0.
      </p>
      <h2>Texts</h2>
      <p>
        <em>Alice&apos;s Adventures in Wonderland</em> by Lewis Carroll is in
        the public domain; the plain text was obtained from Project Gutenberg.
      </p>
      <h2>Scheduling</h2>
      <p>
        Spaced repetition uses the FSRS algorithm via the MIT-licensed{" "}
        <a href="https://github.com/open-spaced-repetition/ts-fsrs">ts-fsrs</a>{" "}
        library.
      </p>
      <h2>Software and type</h2>
      <p>
        Built with Next.js and other open-source packages under their
        respective licenses (see <code>package.json</code>). Text is set in
        Noto Serif and Noto Serif CJK, licensed under the SIL Open Font
        License.
      </p>
    </ProsePage>
  );
}
