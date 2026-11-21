"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, LockKeyhole, TrainFront } from "lucide-react";
import { loginAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, {});
  const t = useTranslations("auth");
  return <main className="mx-auto grid min-h-[calc(100vh-76px)] max-w-7xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_.85fr] lg:px-8">
    <div className="hidden max-w-xl lg:block"><div className="grid size-14 place-items-center rounded-2xl bg-blue-950 text-orange-400"><TrainFront size={28} /></div><h1 className="mt-7 text-5xl font-semibold tracking-tight text-slate-950 dark:text-white">Your journeys, all together.</h1><p className="mt-5 text-lg leading-8 text-slate-500 dark:text-slate-400">Sign in to view your demo bookings and keep your travel plans in one place.</p><div className="mt-8 flex items-center gap-3 text-sm text-slate-500"><LockKeyhole size={17} className="text-orange-600" />Password protected · Simulated reservations</div></div>
    <Card className="mx-auto w-full max-w-lg rounded-3xl p-6 sm:p-9"><div><p className="text-xs font-bold uppercase tracking-[.17em] text-orange-600">{t("loginTitle")}</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{t("loginTitle")}</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Use the email and password on your demo account.</p></div>
      <form action={action} className="mt-7 space-y-5"><div><Label htmlFor="email">{t("email")}</Label><Input required id="email" type="email" name="email" autoComplete="email" placeholder="you@example.com" /></div><div><Label htmlFor="password">{t("password")}</Label><Input required id="password" type="password" name="password" autoComplete="current-password" placeholder={t("password")} /></div>{state.error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">{state.error}</p>}<Button className="w-full" size="lg" type="submit" disabled={pending}>{pending ? t("loginPending") : t("loginTitle")}<ArrowRight size={17} /></Button></form>
      <p className="mt-6 text-center text-sm text-slate-500">{t("newHere")} <Link className="font-semibold text-blue-900 underline decoration-orange-400 underline-offset-4 dark:text-orange-300" href="/register">{t("registerTitle")}</Link></p><p className="mt-7 border-t border-slate-100 pt-5 text-center text-xs leading-5 text-slate-400 dark:border-slate-800">Academic demonstration only. No real railway reservations are made.</p>
    </Card>
  </main>;
}
