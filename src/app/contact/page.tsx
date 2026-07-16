import type { Metadata } from "next";
import ProsePage from "@/components/ProsePage";

export const metadata: Metadata = { title: "contact - weave" };

export default function ContactPage() {
  return (
    <ProsePage eyebrow="CONTACT" title="Get in touch">
      <p>
        weave is made by Nate Sproul at SproulTech. For questions, bug reports,
        or interest in the project:
      </p>
      <ul>
        <li>
          Email: <a href="mailto:nate@sproultech.com">nate@sproultech.com</a>
        </li>
        <li>
          Web: <a href="https://sproultech.com">sproultech.com</a>
        </li>
      </ul>
    </ProsePage>
  );
}
