/**
 * Navigation definitions.
 *
 * Icons are referenced by NAME, not by component. These arrays cross the
 * server → client boundary (the shell is a Server Component, the nav is a
 * Client Component) and React can only serialize plain data — passing a Lucide
 * component here throws "Functions cannot be passed directly to Client
 * Components". The name is resolved to a real icon inside `sidebar-nav.tsx`.
 */
export type NavIconName =
  | "dashboard"
  | "learn"
  | "tests"
  | "progress"
  | "profile"
  | "users"
  | "pdfs"
  | "questions"
  | "analytics"
  | "retests"
  | "loginRequests";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  description?: string;
};

export const LEARNER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", description: "Your overview" },
  { href: "/learn", label: "Learning material", icon: "learn", description: "PDFs for your trade" },
  { href: "/study", label: "Bilingual study notes", icon: "learn", description: "Read in Hindi or English" },
  { href: "/tests", label: "Tests", icon: "tests", description: "Take an assessment" },
  { href: "/progress", label: "Progress", icon: "progress", description: "Scores and trends" },
  { href: "/profile", label: "Profile", icon: "profile", description: "Your details" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "dashboard" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/pdfs", label: "PDFs", icon: "pdfs" },
  { href: "/admin/questions", label: "Questions", icon: "questions" },
  { href: "/admin/analytics", label: "Test analytics", icon: "analytics" },
];
