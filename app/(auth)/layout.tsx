import Link from "next/link";
import { BookOpen, Languages, Timer, TrendingUp } from "lucide-react";

import { InstituteLogo } from "@/components/brand/institute-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { INSTITUTE } from "@/lib/constants";

const HIGHLIGHTS = [
  { icon: BookOpen, text: "The official NIMI question banks for your trade" },
  { icon: Languages, text: "Questions in English and हिन्दी" },
  { icon: Timer, text: "30-minute timed papers with a server-side clock" },
  { icon: TrendingUp, text: "Wrong answers linked to the page that explains them" },
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
        <Link href="/" className="relative flex items-center gap-2.5 text-lg font-semibold">
          <InstituteLogo size={44} className="h-11 w-11 shrink-0" title={null} priority />
          <span className="flex flex-col leading-tight">
            <span>{INSTITUTE.shortName}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {INSTITUTE.city} · ITI code {INSTITUTE.scvtCode}
            </span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <InstituteLogo size={128} className="mb-8 h-32 w-32" />
          <h2 className="text-balance text-3xl font-bold tracking-tight">
            Skill Today, <span className="text-saffron">Success Tomorrow</span>
          </h2>
          <p lang="hi" className="mt-2 text-sm font-medium text-primary dark:text-gold">
            {INSTITUTE.mottoHi}
          </p>
          <p className="mt-4 text-muted-foreground">
            Study material and trade-test practice for Fitter, Electrician, Solar Technician
            and Basic Cosmetology, matched to the trade you choose.
          </p>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item.text} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary dark:bg-gold/15 dark:text-gold">
                  <item.icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-muted-foreground">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="tiranga-rule mb-3 max-w-[10rem] opacity-60" aria-hidden />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {INSTITUTE.name}, {INSTITUTE.city}
            <span className="mt-1 block">
              {INSTITUTE.affiliation} · ITI code {INSTITUTE.scvtCode}
            </span>
          </p>
        </div>
      </aside>

      <main id="main" className="flex flex-col">
        <div className="flex items-center justify-between p-4 lg:justify-end">
          <Link href="/" className="flex items-center gap-2 font-semibold lg:hidden">
            <InstituteLogo size={36} className="h-9 w-9 shrink-0" title={null} />
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
