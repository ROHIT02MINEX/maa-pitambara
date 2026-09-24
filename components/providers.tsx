"use client";

import * as React from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/components/language-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <LanguageProvider><TooltipProvider delayDuration={200}>{children}</TooltipProvider></LanguageProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
