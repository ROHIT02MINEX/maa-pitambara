import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

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
    default: "Skill Learning & Assessment Portal",
    template: "%s · Skill Portal",
  },
  description:
    "Occupation-wise learning material and timed assessments for Fitter, Electrician, Solar Technician and Basic Cosmetology trainees.",
  applicationName: "Skill Portal",
  keywords: ["ITI", "skill development", "assessment", "fitter", "electrician", "solar", "cosmetology"],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    title: "Skill Learning & Assessment Portal",
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
