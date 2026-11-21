"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowDownUp, ArrowRight, CalendarDays, Check, ChevronDown, Clock3, Compass, ShieldCheck, TrainFront, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

const routes = [
  { from: "Bengaluru", to: "Mysuru", codes: "SBC → MYS", duration: "2h 30m", color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-200", query: "SBC-MYS" },
  { from: "Bengaluru", to: "Chennai", codes: "SBC → MAS", duration: "6h 55m", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-200", query: "SBC-MAS" },
  { from: "Bengaluru", to: "Hubballi", codes: "SBC → UBL", duration: "10h 30m", color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-200", query: "SBC-UBL" },
];

export default function HomePage() {
  const t = useTranslations("home");
  const common = useTranslations("common");
  return <main>
    <section className="relative overflow-hidden bg-[#0b1834] text-white">
      <div className="hero-grid absolute inset-0 opacity-40" />
      <div className="absolute -right-40 -top-48 size-[560px] rounded-full bg-blue-700/20 blur-3xl" />
      <div className="absolute -bottom-80 left-1/3 size-[520px] rounded-full bg-orange-500/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:px-8 lg:pb-24 lg:pt-24">
        <div className="max-w-2xl">
          <Badge className="border border-white/10 bg-white/10 text-orange-200"><span className="mr-2 size-1.5 rounded-full bg-orange-400" />{t("eyebrow")}</Badge>
          <h1 className="mt-7 text-5xl font-semibold leading-[1.04] tracking-tight sm:text-6xl lg:text-[68px]">{t("headline").split(" ").slice(0, -2).join(" ")} <span className="text-orange-400">{t("headline").split(" ").slice(-2).join(" ")}</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">{t("subhead")}</p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-300"><span className="inline-flex items-center gap-2"><Check size={16} className="text-orange-400" />Clear sample schedules</span><span className="inline-flex items-center gap-2"><Check size={16} className="text-orange-400" />Easy trip management</span></div>
        </div>

        <Card className="relative rounded-3xl border-white/70 p-5 shadow-2xl shadow-slate-950/25 sm:p-7">
          <div className="flex items-start justify-between"><div><p className="text-lg font-bold text-slate-950 dark:text-white">Plan your journey</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Find a sample train that fits your day.</p></div><span className="rounded-lg bg-orange-50 p-2.5 text-orange-600 dark:bg-orange-950 dark:text-orange-300"><TrainFront size={21} /></span></div>
          <form action="/trains/search" method="get" className="mt-6">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div><Label htmlFor="fromCode">{t("from")}</Label><select required id="fromCode" name="from" defaultValue="SBC" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"><option value="SBC">Bengaluru · SBC</option><option value="MYS">Mysuru · MYS</option><option value="MAS">Chennai · MAS</option><option value="UBL">Hubballi · UBL</option></select></div>
              <span className="mb-1 hidden size-10 place-items-center rounded-full bg-slate-100 text-slate-500 sm:grid dark:bg-slate-800"><ArrowDownUp size={16} /></span>
              <div><Label htmlFor="toCode">{t("to")}</Label><select required id="toCode" name="to" defaultValue="MYS" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"><option value="MYS">Mysuru · MYS</option><option value="MAS">Chennai · MAS</option><option value="UBL">Hubballi · UBL</option><option value="SBC">Bengaluru · SBC</option></select></div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div><Label htmlFor="date">{t("date")}</Label><Input id="date" name="date" type="date" required min={new Date().toISOString().slice(0, 10)} /></div>
              <div><Label htmlFor="travelClass">{t("class")}</Label><select id="travelClass" name="class" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"><option value="SL">Sleeper</option><option value="THREE_AC">3A · AC</option><option value="TWO_AC">2A · AC</option></select></div>
              <div><Label htmlFor="passengers">{t("passengers")}</Label><select id="passengers" name="passengers" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">{[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count}</option>)}</select></div>
            </div>
            <Button type="submit" size="lg" className="mt-5 w-full"><Compass size={18} />{common("search")}<ArrowRight size={18} className="ml-auto" /></Button>
            <p className="mt-3 text-center text-xs text-slate-400">Sample data only · No real railway reservations</p>
          </form>
        </Card>
      </div>
      <div className="relative border-t border-white/10 bg-white/[.035]"><div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-5 text-center sm:grid-cols-4 sm:px-6 lg:px-8"><div><p className="text-xl font-semibold">Sample data</p><p className="mt-1 text-xs text-slate-400">Clearly labelled</p></div><div><p className="text-xl font-semibold">4 stations</p><p className="mt-1 text-xs text-slate-400">Seeded routes</p></div><div><p className="text-xl font-semibold">3 demo trains</p><p className="mt-1 text-xs text-slate-400">Illustrative schedules</p></div><div><p className="text-xl font-semibold">Built for clarity</p><p className="mt-1 text-xs text-slate-400">Responsive by design</p></div></div></div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-orange-600">Explore the sample network</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{t("popularRoutes")}</h2></div><Button asChild variant="ghost"><Link href="/trains/search">Browse all sample trains<ArrowRight size={16} /></Link></Button></div>
      <div className="mt-7 grid gap-4 md:grid-cols-3">{routes.map((route) => <Link key={route.query} href={`/trains/search?route=${route.query}`} className="group"><Card className="h-full rounded-2xl p-5 transition duration-200 group-hover:-translate-y-1 group-hover:shadow-xl"><div className="flex items-center justify-between"><span className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${route.color}`}>{route.codes}</span><ArrowRight size={17} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-orange-500" /></div><div className="mt-5 flex items-baseline gap-2"><h3 className="text-lg font-semibold text-slate-950 dark:text-white">{route.from}</h3><ArrowRight size={15} className="text-slate-400" /><h3 className="text-lg font-semibold text-slate-950 dark:text-white">{route.to}</h3></div><div className="mt-3 flex items-center gap-2 text-sm text-slate-500"><Clock3 size={15} />Sample journey · {route.duration}</div></Card></Link>)}</div>
    </section>

    <section className="border-y border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50"><div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[.18em] text-orange-600">Made for the details</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{t("why")}</h2><p className="mt-3 text-slate-500 dark:text-slate-400">{t("whySub")}</p></div><div className="mt-10 grid gap-5 md:grid-cols-3"><Feature icon={<Compass />} title={t("featureSearch")} text={t("featureSearchText")} /><Feature icon={<WalletCards />} title={t("featureSeat")} text={t("featureSeatText")} /><Feature icon={<ShieldCheck />} title={t("featureTrip")} text={t("featureTripText")} /></div></div></section>
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="flex gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-950 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-100"><CalendarDays className="mt-1 shrink-0 text-orange-600" size={18} /><p>{t("sampleNotice")}</p><ChevronDown className="ml-auto hidden shrink-0 text-orange-500 sm:block" size={18} /></div></section>
    <footer className="border-t border-slate-200 dark:border-slate-800"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><p>© {new Date().getFullYear()} RailConnect · Academic demonstration</p><p>Simulated schedules, payments, PNRs, tickets, and tracking.</p></div></footer>
  </main>;
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <Card className="p-6"><div className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-950 dark:bg-blue-950 dark:text-blue-200">{icon}</div><h3 className="mt-5 text-base font-semibold text-slate-950 dark:text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p></Card>;
}
