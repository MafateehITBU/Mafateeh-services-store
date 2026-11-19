import { storefrontFonts } from "@/app/fonts";
import { env } from "@/lib/env";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL),
  title: {
    default: "Mafateeh Admin",
    template: "%s · Mafateeh Admin",
  },
  robots: { index: false, follow: false },
};

export const instant = false;

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${storefrontFonts} h-full`}>
      <body className="min-h-full bg-[#f3f5f4] text-ink antialiased">{children}</body>
    </html>
  );
}
