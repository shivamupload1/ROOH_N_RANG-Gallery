import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Client Gallery | Rooh N Rang",
  description: "Private wedding gallery."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
