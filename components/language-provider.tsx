"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Language } from "@/lib/constants";
const KEY = "mppiti.language";
const LanguageContext = createContext({ language: "en" as Language, setLanguage: (_next: Language) => {}, ready: false });
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, update] = useState<Language>("en");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem(KEY) === "hi") update("hi"); } catch {}
    setReady(true);
    const sync = (event: StorageEvent) => { if (event.key === KEY) update(event.newValue === "hi" ? "hi" : "en"); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const setLanguage = useCallback((next: Language) => {
    update(next);
    try { localStorage.setItem(KEY, next); } catch {}
  }, []);
  const value = useMemo(() => ({ language, setLanguage, ready }), [language, setLanguage, ready]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function usePortalLanguage() { return useContext(LanguageContext); }
