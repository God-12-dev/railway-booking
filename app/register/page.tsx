"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, ShieldCheck, TrainFront } from "lucide-react";
import { registerAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, {});
  const t = useTranslations("auth");
  return <main className="mx-auto grid min-h-[calc(100vh-76px)] max-w-7xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[.9fr_1fr] lg:px-8">
    <div className="hidden max-w-xl lg:block"><div className="grid size-14 place-items-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"><TrainFront size={28} /></div><h1 className="mt-7 text-5xl font-semibold tracking-tight text-slate-950 dark:text-white">A better way to keep trip plans.</h1><p className="mt-5 text-lg leading-8 text-slate-500 dark:text-slate-400">Create a demo account to explore sample bookings, seat selection, and journey details.</p><div className="mt-8 flex items-center gap-3 text-sm text-slate-500"><ShieldCheck size={17} className="text-emerald-600" />Secure password hashing · No card details</div></div>
    <Card className="mx-auto w-full max-w-lg rounded-3xl p-6 sm:p-9"><div><p className="text-xs font-bold uppercase tracking-[.17em] text-orange-600">Get started</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{t("registerTitle")}</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Set up your RailConnect demo profile.</p></div>
      <form action={action} className="mt-7 space-y-5"><div><Label htmlFor="name">{t("name")}</Label><Input required minLength={2} maxLength={80} id="name" name="name" autoComplete="name" placeholder={t("yourName")} /></div><div><Label htmlFor="email">{t("email")}</Label><Input required type="email" id="email" name="email" autoComplete="email" placeholder="you@example.com" /></div><div><Label htmlFor="password">{t("password")}</Label><Input required minLength={12} maxLength={128} type="password" id="password" name="password" autoComplete="new-password" placeholder="At least 12 characters" /><p className="mt-2 text-xs text-slate-400">{t("passwordHint")}</p></div>{state.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">{state.error}</p>}<Button className="w-full" size="lg" type="submit" disabled={pending}>{pending ? t("registerPending") : t("registerTitle")}<ArrowRight size={17} /></Button></form>
      <p className="mt-6 text-center text-sm text-slate-500">{t("alreadyAccount")} <Link className="font-semibold text-blue-900 underline decoration-orange-400 underline-offset-4 dark:text-orange-300" href="/login">{t("loginTitle")}</Link></p><p className="mt-7 border-t border-slate-100 pt-5 text-center text-xs leading-5 text-slate-400 dark:border-slate-800">Academic demonstration only. No real railway reservations are made.</p>
    </Card>
  </main>;
}
