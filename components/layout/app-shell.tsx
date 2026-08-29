import Link from "next/link";

import { InstituteLogo } from "@/components/brand/institute-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { Badge } from "@/components/ui/badge";
import type { NavItem } from "@/components/layout/nav-items";
import { AdminPresence } from "@/components/layout/admin-presence";

type AppShellProps = {
  children: React.ReactNode;
  items: NavItem[];
  title: string;
  subtitle?: string;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    isAdmin: boolean;
  };
  /** Rendered in the sidebar footer, e.g. an "exit admin" link. */
  sidebarFooter?: React.ReactNode;
  /** Rendered in the top bar, left of the theme toggle (e.g. global search). */
  headerActions?: React.ReactNode;
};

/** Shared chrome for both the learner area and the admin panel. */
export function AppShell({
  children,
  items,
  title,
  subtitle,
  user,
  sidebarFooter,
  headerActions,
}: AppShellProps) {
  return (
    <div className="app-shell-bg min-h-dvh">
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border/60 bg-background/60 p-4 backdrop-blur-xl lg:flex">
          <Link href="/dashboard" className="flex items-center gap-2.5 px-2 font-semibold">
            <InstituteLogo size={40} className="h-10 w-10 shrink-0" title={null} />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate">{title}</span>
              {subtitle ? (
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {subtitle}
                </span>
              ) : null}
            </span>
          </Link>
          <div className="gold-rule my-4" aria-hidden />

          <SidebarNav items={items} />

          <div className="mt-auto space-y-3 pt-6">{sidebarFooter}</div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
              <MobileNav items={items} title={title} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold lg:hidden">{title}</p>
                {subtitle ? (
                  <Badge variant="secondary" className="hidden lg:inline-flex">
                    {subtitle}
                  </Badge>
                ) : null}
              </div>

              {headerActions}
              <AdminPresence isAdmin={user.isAdmin} />
              <ThemeToggle />
              <UserMenu
                name={user.name}
                email={user.email}
                image={user.image}
                isAdmin={user.isAdmin}
              />
            </div>
          </header>

          <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
