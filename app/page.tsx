
import { T } from "@/components/translated-text";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Briefcase,
  Clock,
  FileText,
  GraduationCap,
  Languages,
  Lightbulb,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PortalLanguageToggle } from "@/components/portal-language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { InstituteLogo } from "@/components/brand/institute-logo";
import {
  INSTITUTE,
  INSTITUTE_PILLARS,
  OCCUPATIONS,
  OCCUPATION_DESCRIPTIONS,
  OCCUPATION_LABELS,
  PASS_PERCENTAGE,
  SUBJECT_LABELS,
  SUBJECTS,
  TEST_BLUEPRINT,
  TEST_QUESTION_COUNT,
} from "@/lib/constants";
import { currentUser } from "@/lib/auth";

const PILLAR_ICONS = [Sparkles, Lightbulb, Briefcase, TrendingUp];

const FEATURES = [
  {
    icon: BookOpen,
    title: "The official NIMI question banks",
    body: "Every AITT sample paper and DGT question bank for your trade is published here. Read it in the browser, bookmark it, and download it for later.",
  },
  {
    icon: Languages,
    title: "English and हिन्दी, side by side",
    body: "Questions taken from the bilingual AITT papers carry their Hindi text. Switch language mid-test without losing a single answer.",
  },
  {
    icon: Timer,
    title: "Built to the real paper",
    body: `${TEST_QUESTION_COUNT} questions in the same subject mix as the trade test: theory, workshop calculation, drawing and employability skills. ${PASS_PERCENTAGE}% to pass, no negative marking.`,
  },
  {
    icon: Target,
    title: "Every wrong answer names its page",
    body: "Miss a question and the result tells you which document and which page it came from, so revision starts where you actually went wrong.",
  },
  {
    icon: BarChart3,
    title: "Progress you can see",
    body: "Attempts, best and average scores, accuracy per topic and per subject, plus a study plan built from the questions you missed.",
  },
  {
    icon: GraduationCap,
    title: "Built for the institute",
    body: "Instant sign-in, unlimited practice tests, and an admin panel for users, study material, question banks and exports.",
  },
];

export default async function LandingPage() {
  const user = await currentUser();

  return (
    <div className="app-shell-bg min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 font-semibold">
            <InstituteLogo size={44} className="h-11 w-11 shrink-0" title={null} priority />
            <span className="hidden flex-col leading-tight sm:flex">
              <span><T>{INSTITUTE.shortName}</T></span>
              <span className="text-xs font-normal text-muted-foreground">
                <T>{INSTITUTE.city}</T><T>{" · ITI code "}</T><T>{INSTITUTE.scvtCode}</T>
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-2" aria-label="Primary">
            <PortalLanguageToggle />
              <ThemeToggle />
            {user ? (
              <Button asChild>
                <Link href="/dashboard"><T>{" Go to dashboard "}</T><ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login"><T>{"Sign in"}</T></Link>
                </Button>
                <Button asChild>
                  <Link href="/signup"><T>{"Get started"}</T></Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main">
        {/* ---------------------------------------------------------------- */}
        {/* Hero                                                              */}
        {/* ---------------------------------------------------------------- */}
        <section className="container py-14 md:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
            <div className="text-center lg:text-left">
              <Badge className="mb-5"><T>{INSTITUTE.portalName}</T></Badge>
              <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"><T>{" Skill Today,"}</T><T>{" "}</T>
                <span className="text-saffron"><T>{"Success Tomorrow"}</T></span>
              </h1>
              <p
                lang="hi"
                className="mt-3 text-lg font-semibold text-primary dark:text-gold"
              >
                <T>{INSTITUTE.mottoHi}</T>
              </p>
              <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground lg:mx-0"><T>{" Study the official NIMI and DGT material for your trade, then sit a timed practice paper built to the same blueprint as the All India Trade Test, in English or Hindi, with every wrong answer pointing you back to the page that explains it. "}</T></p>
              <p className="mx-auto mt-4 max-w-xl text-xs text-muted-foreground lg:mx-0">
                <T>{INSTITUTE.name}</T><T>{", "}</T><T>{INSTITUTE.city}</T><T>{" · "}</T><T>{INSTITUTE.affiliation}</T><T>{" · ITI code"}</T><T>{" "}</T>
                <T>{INSTITUTE.scvtCode}</T><T>{" · NCVT MIS "}</T><T>{INSTITUTE.ncvtCode}</T>
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                <Button asChild size="lg">
                  <Link href={user ? "/dashboard" : "/signup"}>
                    <T>{user ? "Open dashboard" : "Create your account"}</T><T>{" "}</T>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href={user ? "/learn" : "/login"}>
                    <T>{user ? "Browse material" : "I already have an account"}</T>
                  </Link>
                </Button>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="relative">
                <div
                  className="absolute -inset-8 rounded-full bg-gold/15 blur-3xl"
                  aria-hidden
                />
                <InstituteLogo
                  size={320}
                  priority
                  className="relative h-64 w-64 animate-float drop-shadow-xl sm:h-80 sm:w-80"
                />
              </div>
            </div>
          </div>

          {/* The four pillars from the seal. */}
          <ul className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
            {INSTITUTE_PILLARS.map((pillar, index) => {
              const Icon = PILLAR_ICONS[index]!;
              return (
                <li key={pillar.label} className="glass rounded-xl px-4 py-5 text-center">
                  <span className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="text-sm font-semibold"><T>{pillar.label}</T></p>
                  <p lang="hi" className="text-xs text-muted-foreground">
                    <T>{pillar.labelHi}</T>
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Exam blueprint                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-y border-border/60 bg-card/50 py-16" aria-labelledby="blueprint">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 id="blueprint" className="text-2xl font-semibold tracking-tight sm:text-3xl"><T>{" A practice paper, not a random quiz "}</T></h2>
              <p className="mt-3 text-muted-foreground"><T>{" Each attempt draws "}</T><T>{TEST_QUESTION_COUNT}</T><T>{" questions in the same proportion as the real trade test, so what you practise is what you sit. "}</T></p>
            </div>

            <ul className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {SUBJECTS.map((subject) => {
                const weight =
                  TEST_BLUEPRINT.find((row) => row.subject === subject)?.weight ?? 0;
                return (
                  <li key={subject} className="glass rounded-xl p-5">
                    <p className="text-3xl font-bold text-primary dark:text-gold">
                      <T>{Math.round(weight * 100)}</T><T>{"% "}</T></p>
                    <div className="gold-rule my-3" aria-hidden />
                    <p className="text-sm font-medium leading-snug"><T>{SUBJECT_LABELS[subject]}</T></p>
                    <p className="mt-1 text-xs text-muted-foreground"><T>{" ≈ "}</T><T>{Math.round(TEST_QUESTION_COUNT * weight)}</T><T>{" of "}</T><T>{TEST_QUESTION_COUNT}</T><T>{" "}</T><T>{" questions "}</T></p>
                  </li>
                );
              })}
            </ul>

            <dl className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-4">
              {[
                { label: "Questions per test", value: TEST_QUESTION_COUNT, icon: FileText },
                { label: "Minutes on the clock", value: 30, icon: Clock },
                { label: "Percent to pass", value: PASS_PERCENTAGE, icon: GraduationCap },
              ].map((stat) => (
                <div key={stat.label} className="glass rounded-xl p-4 text-center">
                  <stat.icon className="mx-auto mb-2 h-5 w-5 text-primary dark:text-gold" aria-hidden />
                  <dt className="sr-only"><T>{stat.label}</T></dt>
                  <dd className="text-2xl font-bold"><T>{stat.value}</T></dd>
                  <p className="mt-1 text-xs text-muted-foreground"><T>{stat.label}</T></p>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Trades                                                            */}
        {/* ---------------------------------------------------------------- */}
        <section className="container py-16" aria-labelledby="trades-heading">
          <h2
            id="trades-heading"
            className="text-center text-2xl font-semibold tracking-tight sm:text-3xl"
          ><T>{" Four trades, four separate question banks "}</T></h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground"><T>{" You pick one occupation when you create your profile. Everything after that, material and assessments alike, belongs to that trade, with Employability Skills shared across all four. "}</T></p>

          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {OCCUPATIONS.map((occupation) => (
              <li
                key={occupation}
                className="glass group rounded-xl p-6 transition-transform hover:-translate-y-1"
              >
                <span
                  className="mb-4 block h-1 w-12 rounded-full bg-gold transition-all group-hover:w-20"
                  aria-hidden
                />
                <h3 className="text-lg font-semibold"><T>{OCCUPATION_LABELS[occupation]}</T></h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  <T>{OCCUPATION_DESCRIPTIONS[occupation]}</T>
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Features                                                          */}
        {/* ---------------------------------------------------------------- */}
        <section className="container pb-20" aria-labelledby="features-heading">
          <h2 id="features-heading" className="sr-only"><T>{" Features "}</T></h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="glass rounded-xl p-7">
                <span className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary dark:bg-gold/15 dark:text-gold">
                  <feature.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="text-lg font-semibold"><T>{feature.title}</T></h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  <T>{feature.body}</T>
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="crest-band">
        <div className="gold-rule" aria-hidden />
        <div className="container py-10">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3 text-center sm:text-left">
              <InstituteLogo size={56} className="h-14 w-14 shrink-0 rounded-full bg-white/95 p-1" title={null} />
              <div>
                <p className="font-semibold"><T>{INSTITUTE.name}</T></p>
                <p className="mt-1 text-sm text-primary-foreground/80"><T>{INSTITUTE.address}</T></p>
                <p className="mt-1 text-xs text-primary-foreground/70"><T>{INSTITUTE.approval}</T></p>
              </div>
            </div>

            <nav className="flex gap-5 text-sm" aria-label="Footer">
              <Link href="/login" className="hover:text-gold"><T>{" Sign in "}</T></Link>
              <Link href="/signup" className="hover:text-gold"><T>{" Create account "}</T></Link>
            </nav>
          </div>

          <div className="tiranga-rule mt-8 opacity-70" aria-hidden />
          <p className="mt-4 text-center text-xs text-primary-foreground/70"><T>{" © "}</T><T>{new Date().getFullYear()}</T> <T>{INSTITUTE.name}</T><T>{", "}</T><T>{INSTITUTE.city}</T><T>{" · ITI code"}</T><T>{" "}</T>
            <T>{INSTITUTE.scvtCode}</T><T>{" · "}</T><T>{INSTITUTE.phone}</T>
          </p>
        </div>
      </footer>
    </div>
  );
}
