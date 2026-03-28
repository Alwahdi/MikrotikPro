export type Locale = "en" | "ar";

export const defaultLocale: Locale = "en";
export const locales: Locale[] = ["en", "ar"];
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isRTL(locale: Locale): boolean {
  return locale === "ar";
}

export const localeNames: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};
