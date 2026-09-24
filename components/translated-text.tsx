"use client";
import { Children, type ReactNode } from "react";
import { useLanguage } from "@/hooks/use-language";
import { translate } from "@/lib/i18n";
/** Translate known interface copy; preserve names, email addresses and user data. */
export function T({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  return <>{Children.map(children, child => typeof child === "string" ? translate(child, language) : child)}</>;
}
