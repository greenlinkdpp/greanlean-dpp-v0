import "./globals.css";

import type { Metadata } from "next";
import { LanguageProvider } from "@/components/LanguageProvider";

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
