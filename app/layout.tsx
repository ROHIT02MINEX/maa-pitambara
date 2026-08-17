import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";

import { INSTITUTE } from "@/lib/constants";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// The question banks are bilingual, so Devanagari is a first-class face here
// rather than whatever the device happens to fall back to.
const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-devanagari",
  display: "swap",
});

function getMetadataBase(): URL {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || "http://localhost:3000").trim();
  try {
    const formatted = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
    return new URL(formatted);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: `${INSTITUTE.name} · ${INSTITUTE.portalName}`,
    template: `%s · ${INSTITUTE.shortName}`,
  },
  description: `Occupation-wise learning material and timed assessments for trainees of ${INSTITUTE.name}, ${INSTITUTE.city}: Fitter, Electrician, Solar Technician and Basic Cosmetology.`,
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
  // Paper white and seal navy — the two grounds of the institute crest.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1327" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${devanagari.variable} font-sans`}>
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
