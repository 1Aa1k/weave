import type { Metadata } from "next";
import Landing from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: "weave - learn a language by reading",
  description:
    "A reader that swaps English words for the language you're learning, fifteen at a time, until the book changes language under you.",
};

export default function Home() {
  return <Landing />;
}
