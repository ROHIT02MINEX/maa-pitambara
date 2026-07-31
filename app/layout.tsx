import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { INSTITUTE } from "@/lib/constants";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: `${INSTITUTE.name} · ${INSTITUTE.portalName}`,
    template: `%s · ${INSTITUTE.shortName}`,
  },
  description: `Occupation-wise learning material and timed assessments for trainees of ${INSTITUTE.name}, ${INSTITUTE.city} — Fitter, Electrician, Solar Technician and Basic Cosmetology.`,
  applicationName: INSTITUTE.shortName,
  keywords: [
    "ITI",
    "Maa Pitambra",
    "Jhansi",
    "skill development",
    "assessment",
    "fitter",
    "electrician",
    "solar technician",
    "cosmetology",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    title: `${INSTITUTE.name} · ${INSTITUTE.portalName}`,
    description: "Learn from trade-specific material and prove your skills with timed tests.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          <a href="#main" className="sr-only sr-only-focusable">
            Skip to main content
          </a>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
