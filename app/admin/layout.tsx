
import { T } from "@/components/translated-text";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { currentUser } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { ADMIN_NAV } from "@/components/layout/nav-items";
import { GlobalSearch } from "@/components/admin/global-search";
import { Button } from "@/components/ui/button";

/** Admin panel. Access is gated in the middleware and re-checked here. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user?.id) redirect("/login?expired=1");
  if (user.role !== "ADMIN") redirect("/dashboard?error=forbidden");

  return (
    <AppShell
      items={ADMIN_NAV}
      title="Admin panel"
      subtitle="Administrator"
      user={{ name: user.name, email: user.email, image: user.image, isAdmin: true }}
      headerActions={<GlobalSearch />}
      sidebarFooter={
        <Button asChild variant="outline" className="w-full">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" /><T>{" Back to portal "}</T></Link>
        </Button>
      }
    >
      <T>{children}</T>
    </AppShell>
  );
}
