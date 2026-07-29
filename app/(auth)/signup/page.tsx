import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/signup-form";
import { envStatus } from "@/lib/env";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Skill Learning & Assessment Portal account.",
};

export default function SignupPage() {
  return <SignupForm googleEnabled={envStatus().google} />;
}
