"use client";

import * as React from "react";
import { toast } from "sonner";

import { resendVerificationAction } from "@/actions/auth";
import { runAction } from "@/lib/run-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResendVerification() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const result = await runAction(() => resendVerificationAction({ email }));
    setLoading(false);
    if (result.ok) toast.success(result.message ?? "Verification e-mail sent.");
    else toast.error(result.error);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-left">
      <Label htmlFor="resend-email">Send a new verification link</Label>
      <div className="flex gap-2">
        <Input
          id="resend-email"
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" loading={loading}>
          Send
        </Button>
      </div>
    </form>
  );
}
