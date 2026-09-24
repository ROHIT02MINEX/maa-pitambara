"use client";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/hooks/use-language";
export function PortalLanguageToggle() {
  const { language, setLanguage } = useLanguage();
  return <LanguageToggle value={language} onChange={setLanguage} className="shrink-0" />;
}
