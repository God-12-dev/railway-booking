"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import en from "@/messages/en.json";
import hi from "@/messages/hi.json";
import kn from "@/messages/kn.json";

export type Locale = "en" | "hi" | "kn";
export const catalog = { en, hi, kn };
const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void } | null>(null);

export function useLocalePreference() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocalePreference must be used within Providers");
  return value;
}

export function Providers({ children, initialLocale }: { children: React.ReactNode; initialLocale: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const value = useMemo(() => ({
    locale,
    setLocale(next: Locale) {
      setLocaleState(next);
      document.cookie = `railconnect_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
      document.documentElement.lang = next;
    },
  }), [locale]);

  return <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
    <LocaleContext.Provider value={value}>
      <NextIntlClientProvider locale={locale} messages={catalog[locale]}>{children}</NextIntlClientProvider>
    </LocaleContext.Provider>
  </ThemeProvider>;
}
