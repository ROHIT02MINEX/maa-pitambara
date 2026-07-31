import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Clock,
  FileText,
  GraduationCap,
  ShieldCheck,
  Timer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { INSTITUTE, OCCUPATIONS, OCCUPATION_DESCRIPTIONS, OCCUPATION_LABELS } from "@/lib/constants";
import { PASS_PERCENTAGE, TEST_QUESTION_COUNT } from "@/lib/constants";
import { currentUser } from "@/lib/auth";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Trade-specific material",
    body: "Every learner sees only the PDFs published for their own occupation. Read in the browser, download, bookmark and pick up where you left off.",
  },
  {
    icon: Timer,
    title: "Honest, timed assessments",
    body: `${TEST_QUESTION_COUNT} random questions, ${PASS_PERCENTAGE}% to pass, one mark each and no negative marking. The clock lives on the server, so refreshing changes nothing.`,
  },
  {
    icon: BarChart3,
    title: "Progress you can see",
    body: "Track attempts, best and average scores, per-topic accuracy and completion — with recommended reading for the topics you missed.",
  },
  {
    icon: ShieldCheck,
    title: "Built for institutions",
    body: "Verified e-mail sign-in, Google OAuth, role-based access and a full admin panel for users, material, question banks and exports.",
  },
];

export default async function LandingPage() {
  const user = await currentUser();

  return (
    <div className="app-shell-bg min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span>{INSTITUTE.shortName}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {INSTITUTE.city} · ITI code {INSTITUTE.scvtCode}
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-2" aria-label="Primary">
            <ThemeToggle />
            {user ? (
              <Button asChild>
                <Link href="/dashboard">
                  Go to dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Get started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="container py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-5">{INSTITUTE.portalName}</Badge>
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Learn your trade. Then prove it.
            </h1>
            <p className="mx-auto mt-3 text-base font-semibold text-primary sm:text-lg">
              {INSTITUTE.name}, {INSTITUTE.city}
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg text-muted-foreground">
              Occupation-wise study material and timed, randomised assessments for Fitter,
              Electrician, Solar Technician and Basic Cosmetology trainees — with progress
              tracking that actually reflects what you know.
            </p>
            <p className="mx-auto mt-3 text-xs text-muted-foreground">
              {INSTITUTE.affiliation} · ITI code {INSTITUTE.scvtCode} · NCVT MIS{" "}
              {INSTITUTE.ncvtCode}
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={user ? "/dashboard" : "/signup"}>
                  {user ? "Open dashboard" : "Create your account"} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href={user ? "/learn" : "/login"}>
                  {user ? "Browse material" : "I already have an account"}
                </Link>
              </Button>
            </div>

            <dl className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-4">
              {[
                { label: "Questions per test", value: TEST_QUESTION_COUNT, icon: FileText },
                { label: "Minutes on the clock", value: 30, icon: Clock },
                { label: "Percent to pass", value: PASS_PERCENTAGE, icon: GraduationCap },
              ].map((stat) => (
                <div key={stat.label} className="glass rounded-xl p-4 text-center">
                  <stat.icon className="mx-auto mb-2 h-5 w-5 text-primary" aria-hidden />
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="text-2xl font-bold">{stat.value}</dd>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="container pb-20" aria-labelledby="trades-heading">
          <h2 id="trades-heading" className="text-center text-2xl font-semibold tracking-tight">
            Four trades, four separate question banks
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            You pick one occupation when you create your profile. Everything you see after that —
            material and assessments alike — belongs to that trade.
          </p>

          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {OCCUPATIONS.map((occupation) => (
              <li key={occupation} className="glass rounded-xl p-6 transition-transform hover:-translate-y-1">
                <h3 className="text-lg font-semibold">{OCCUPATION_LABELS[occupation]}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {OCCUPATION_DESCRIPTIONS[occupation]}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="container pb-24" aria-labelledby="features-heading">
          <h2 id="features-heading" className="sr-only">
            Features
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="glass rounded-xl p-7">
                <span className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="container flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} {INSTITUTE.name}, {INSTITUTE.city}
            <span className="block text-xs">{INSTITUTE.address}</span>
          </p>
          <nav className="flex gap-5" aria-label="Footer">
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
            <Link href="/signup" className="hover:text-foreground">
              Create account
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
