"use client";
import { T } from "@/components/translated-text";


import * as React from "react";
import Link from "next/link";
import { LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";

import { logoutAction } from "@/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";

export function UserMenu({
  name,
  email,
  image,
  isAdmin,
}: {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isAdmin: boolean;
}) {
  const [pending, startTransition] = React.useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
          <Avatar>
            {image ? <AvatarImage src={image} alt="" /> : null}
            <AvatarFallback><T>{initials(name)}</T></AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-semibold"><T>{name ?? "Trainee"}</T></p>
          <p className="truncate text-xs text-muted-foreground"><T>{email}</T></p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/profile">
            <UserRound /><T>{" Profile "}</T></Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile#security">
            <Settings /><T>{" Change password "}</T></Link>
        </DropdownMenuItem>

        {isAdmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <ShieldCheck /><T>{" Admin panel "}</T></Link>
            </DropdownMenuItem>
          </>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={(event) => {
            event.preventDefault();
            startTransition(() => {
              void logoutAction();
            });
          }}
        >
          <LogOut /> <T>{pending ? "Signing out…" : "Sign out"}</T>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
