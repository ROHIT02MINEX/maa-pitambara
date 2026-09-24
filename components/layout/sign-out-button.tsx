"use client";
import { T } from "@/components/translated-text";


import * as React from "react";
import { LogOut } from "lucide-react";

import { logoutAction } from "@/actions/auth";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Standalone sign-out control for screens that have no account menu. */
export function SignOutButton({
  variant = "ghost",
  size = "sm",
  label = "Sign out",
}: {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  label?: string;
}) {
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      variant={variant}
      size={size}
      loading={pending}
      onClick={() => startTransition(() => void logoutAction())}
    >
      {!pending ? <LogOut className="h-4 w-4" /> : null}
      <T>{label}</T>
    </Button>
  );
}
