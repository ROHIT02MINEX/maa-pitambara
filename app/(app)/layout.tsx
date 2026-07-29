import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { currentUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { LEARNER_NAV } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import { occupationLabel } from "@/lib/constants";

/**
 * Learner area. The middleware already blocks unauthenticated access and
 * incomplete profiles; these checks are the server-side belt-and-braces.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user?.id) redirect("/login");
  if (!user.profileComplete) redirect("/onboarding");

  const isAdmin = user.role === "ADMIN";

  return (
    <AppShell
      items={LEARNER_NAV}
      title="Skill Portal"
      subtitle={occupationLabel(user.occupation)}
      user={{ name: user.name, email: user.email, image: user.image, isAdmin }}
      sidebarFooter={
        isAdmin ? (
          <Button asChild variant="outline" className="w-full">
            <Link href="/admin">
              <ShieldCheck className="h-4 w-4" /> Admin panel
            </Link>
          </Button>
        ) : null
      }
    >
      {children}
    </AppShell>
  );
}
