import "./globals.css";

import type { Metadata } from "next";
import { LanguageProvider } from "@/components/LanguageProvider";

// Per-request rendering is required so Next.js can propagate the middleware
// CSP nonce to framework scripts. Static HTML cannot safely carry a request nonce.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "GREANLEAN DPP",
    template: "%s | GREANLEAN DPP",
  },
  description: "EU Digital Product Passport and ESPR compliance data service.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
