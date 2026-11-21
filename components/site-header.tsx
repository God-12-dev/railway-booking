"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, TrainFront, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const nav = [
    { href: "/trains/search", label: t("trains") },
    { href: "/dashboard", label: t("myTrips") },
    { href: "/track", label: t("track") },
  ];
  return <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
    <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <Link href="/" className="flex items-center gap-2.5" aria-label="RailConnect home">
        <span className="grid size-10 place-items-center rounded-xl bg-blue-950 text-orange-400 dark:bg-orange-500 dark:text-slate-950"><TrainFront size={22} strokeWidth={2.3} /></span>
        <span><span className="block text-base font-extrabold tracking-tight text-slate-950 dark:text-white">RailConnect</span><span className="block text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">Travel, thoughtfully</span></span>
      </Link>
      <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
        {nav.map((item) => <Link key={item.href} className="text-sm font-medium text-slate-600 transition hover:text-blue-950 dark:text-slate-300 dark:hover:text-white" href={item.href}>{item.label}</Link>)}
      </nav>
      <div className="hidden items-center gap-2 md:flex"><LanguageSwitcher /><ThemeToggle /><Button asChild variant="ghost"><Link href="/login">{t("signIn")}</Link></Button><Button asChild><Link href="/register">{t("createAccount")}</Link></Button></div>
      <Button type="button" className="md:hidden" size="icon" variant="ghost" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Menu size={20} />}</Button>
    </div>
    {open && <div className="border-t border-slate-100 px-4 pb-5 pt-3 dark:border-slate-800 md:hidden"><nav className="grid gap-1" aria-label="Mobile navigation">{nav.map((item) => <Link onClick={() => setOpen(false)} key={item.href} className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-900" href={item.href}>{item.label}</Link>)}</nav><div className="mt-3 flex items-center justify-between"><LanguageSwitcher /><ThemeToggle /></div><div className="mt-3 grid grid-cols-2 gap-2"><Button asChild variant="secondary"><Link href="/login">{t("signIn")}</Link></Button><Button asChild><Link href="/register">{t("createAccount")}</Link></Button></div></div>}
  </header>;
}
