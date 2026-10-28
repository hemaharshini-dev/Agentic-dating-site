import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "the test · agentic dating",
  description: "A small dating simulation where profile-grounded agents meet and rank compatibility.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
