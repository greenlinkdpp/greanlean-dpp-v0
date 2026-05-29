import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "GreenLean DPP", description: "Digital Product Passport SaaS" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
