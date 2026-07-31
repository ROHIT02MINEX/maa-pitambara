import Link from "next/link";
import { GraduationCap, ShieldCheck, Timer, TrendingUp } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { INSTITUTE } from "@/lib/constants";

const HIGHLIGHTS = [
  { icon: Timer, text: "30-minute timed tests with a server-side clock" },
  { icon: TrendingUp, text: "Per-topic accuracy and progress tracking" },
  { icon: ShieldCheck, text: "Verified accounts and role-based access" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell-bg grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel — hidden on small screens to keep the form above the fold. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-border/60 p-12 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-24 h-96 w-96 animate-float rounded-full bg-primary/20 blur-3xl"
        />
        <Link href="/" className="relative flex items-center gap-2 text-lg font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="flex flex-col leading-tight">
            <span>{INSTITUTE.shortName}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {INSTITUTE.city} · ITI code {INSTITUTE.scvtCode}
            </span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <h2 className="text-balance text-3xl font-bold tracking-tight">
            Everything a trainee needs, in one place.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Study material and assessments for Fitter, Electrician, Solar Technician and Basic
            Cosmetology — matched to the trade you choose.
          </p>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item.text} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-muted-foreground">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-muted-foreground">
          © {new Date().getFullYear()} {INSTITUTE.name}, {INSTITUTE.city}
          <span className="mt-1 block">{INSTITUTE.affiliation} · ITI code {INSTITUTE.scvtCode}</span>
        </p>
      </aside>

      <main id="main" className="flex flex-col">
        <div className="flex items-center justify-between p-4 lg:justify-end">
          <Link href="/" className="flex items-center gap-2 font-semibold lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" />
            </span>
            {INSTITUTE.shortName}
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center p-4 pb-16">
          <div className="w-full max-w-md animate-fade-in">{children}</div>
        </div>
      </main>
    </div>
  );
}
