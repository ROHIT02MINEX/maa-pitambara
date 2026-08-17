"use client";

import * as React from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";

import { InstituteLogo } from "@/components/brand/institute-logo";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { NavItem } from "@/components/layout/nav-items";

/** Slide-over navigation used below the `lg` breakpoint. */
export function MobileNav({ items, title }: { items: NavItem[]; title: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-background p-4 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left lg:hidden">
          <Dialog.Title className="sr-only">Navigation</Dialog.Title>
          <Dialog.Description className="sr-only">
            Move between the sections of the portal.
          </Dialog.Description>

          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/dashboard"
              className="flex min-w-0 items-center gap-2 font-semibold"
              onClick={() => setOpen(false)}
            >
              <InstituteLogo size={36} className="h-9 w-9 shrink-0" title={null} />
              <span className="truncate">{title}</span>
            </Link>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close navigation">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <SidebarNav items={items} onNavigate={() => setOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
