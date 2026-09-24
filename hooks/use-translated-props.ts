"use client";
import { useLanguage } from "@/hooks/use-language";
import { translate } from "@/lib/i18n";
export function useTranslatedProps<P extends object>(props: P): P {
  const { language } = useLanguage();
  const result = { ...props } as Record<string, unknown>;
  for (const key of ["placeholder", "title", "aria-label", "alt"]) {
    if (typeof result[key] === "string") result[key] = translate(result[key] as string, language);
  }
  return result as P;
}
