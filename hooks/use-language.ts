"use client";

import * as React from "react";

import { LANGUAGES, type Language } from "@/lib/constants";

const STORAGE_KEY = "mppiti.language";

function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * Reading language for bilingual content, persisted per browser.
 *
 * The initial render is always English so the server and client agree; the
 * stored preference is applied in an effect. `ready` tells a caller whether the
 * preference has been read yet, which lets the language switch avoid flashing
 * the wrong label on first paint.
 */
export function useLanguage(): {
  language: Language;
  setLanguage: (next: Language) => void;
  ready: boolean;
} {
  const [language, setLanguageState] = React.useState<Language>("en");
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isLanguage(stored)) setLanguageState(stored);
    } catch {
      // Private browsing or a blocked storage partition — English it is.
    }
    setReady(true);
  }, []);

  const setLanguage = React.useCallback((next: Language) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not persisting is survivable; the choice still applies to this page.
    }
  }, []);

  return { language, setLanguage, ready };
}
