import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kamerkompas",
  description: "Dagdashboard voor Tweede Kamer-agenda, stemmingen, Kamerbrieven, dossiers, Kamerleden en fracties."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
