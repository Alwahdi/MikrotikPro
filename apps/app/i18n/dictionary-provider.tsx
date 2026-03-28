"use client";

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react";
import type { Locale } from "./config";
import { LOCALE_COOKIE, defaultLocale } from "./config";

// The dictionary type mirrors the en.json shape
type NestedRecord = { [key: string]: string | NestedRecord };
export type Dictionary = NestedRecord;

interface DictionaryContextValue {
  dictionary: Dictionary;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const DictionaryContext = createContext<DictionaryContextValue | null>(null);

export function DictionaryProvider({
  dictionary,
  locale,
  children,
}: {
  dictionary: Dictionary;
  locale: Locale;
  children: ReactNode;
}) {
  const setLocale = useCallback((newLocale: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${newLocale};path=/;max-age=31536000;SameSite=Lax`;
    window.location.reload();
  }, []);

  return (
    <DictionaryContext.Provider value={{ dictionary, locale, setLocale }}>
      {children}
    </DictionaryContext.Provider>
  );
}

export function useDictionary() {
  const ctx = useContext(DictionaryContext);
  if (!ctx) {
    throw new Error("useDictionary must be used within DictionaryProvider");
  }

  const { dictionary, locale, setLocale } = ctx;

  // Access nested keys like t("sidebar.dashboard")
  const t = useCallback(
    (key: string): string => {
      const parts = key.split(".");
      let current: unknown = dictionary;
      for (const part of parts) {
        if (current && typeof current === "object" && part in current) {
          current = (current as Record<string, unknown>)[part];
        } else {
          return key; // fallback to key if not found
        }
      }
      return typeof current === "string" ? current : key;
    },
    [dictionary]
  );

  return { t, locale, setLocale, dictionary };
}
