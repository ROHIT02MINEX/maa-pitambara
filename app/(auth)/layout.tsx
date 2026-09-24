
import { T } from "@/components/translated-text";
import Link from "next/link";
import { BookOpen, Languages, Timer, TrendingUp } from "lucide-react";

import { InstituteLogo } from "@/components/brand/institute-logo";
import { PortalLanguageToggle } from "@/components/portal-language-toggle";
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
            <span><T>{INSTITUTE.shortName}</T></span>
            <span className="text-xs font-normal text-muted-foreground">
              <T>{INSTITUTE.city}</T><T>{" · ITI code "}</T><T>{INSTITUTE.scvtCode}</T>
            </span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <InstituteLogo size={128} className="mb-8 h-32 w-32" />
          <h2 className="text-balance text-3xl font-bold tracking-tight"><T>{" Skill Today, "}</T><span className="text-saffron"><T>{"Success Tomorrow"}</T></span>
          </h2>
          <p lang="hi" className="mt-2 text-sm font-medium text-primary dark:text-gold">
            <T>{INSTITUTE.mottoHi}</T>
          </p>
          <p className="mt-4 text-muted-foreground"><T>{" Study material and trade-test practice for Fitter, Electrician, Solar Technician and Basic Cosmetology, matched to the trade you choose. "}</T></p>
          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item.text} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary dark:bg-gold/15 dark:text-gold">
                  <item.icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-muted-foreground"><T>{item.text}</T></span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="tiranga-rule mb-3 max-w-[10rem] opacity-60" aria-hidden />
          <p className="text-xs text-muted-foreground"><T>{" © "}</T><T>{new Date().getFullYear()}</T> <T>{INSTITUTE.name}</T>
            <span className="mt-1 block">
              <T>{INSTITUTE.affiliation}</T><T>{" · ITI code "}</T><T>{INSTITUTE.scvtCode}</T>
            </span>
          </p>
        </div>
      </aside>

      <main id="main" className="flex flex-col">
        <div className="flex items-center justify-between p-4 lg:justify-end">
          <Link href="/" className="flex items-center gap-2 font-semibold lg:hidden">
            <InstituteLogo size={36} className="h-9 w-9 shrink-0" title={null} />
            <T>{INSTITUTE.shortName}</T>
          </Link>
          <PortalLanguageToggle />
              <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center p-4 pb-16">
          <div className="w-full max-w-md animate-fade-in"><T>{children}</T></div>
        </div>
      </main>
    </div>
  );
}
