"use client";

import { useLocalePreference, type Locale } from "@/components/providers";
import { Button } from "@/components/ui/button";

const choices: { id: Locale; label: string }[] = [
  { id: "en", label: "EN" }, { id: "hi", label: "हिं" }, { id: "kn", label: "ಕನ್" },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocalePreference();
  return <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 p-1 dark:border-slate-700" aria-label="Choose language">
    {choices.map((item) => <Button key={item.id} type="button" size="sm" variant={locale === item.id ? "secondary" : "ghost"} className="h-8 px-2.5" aria-pressed={locale === item.id} onClick={() => setLocale(item.id)}>{item.label}</Button>)}
  </div>;
}
