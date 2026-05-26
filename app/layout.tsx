import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Politiekemonitor",
  description: "Volg Tweede Kamer-activiteiten, dossiers, Kamerleden, moties, stemmingen, Kamerbrieven en debatten."
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
