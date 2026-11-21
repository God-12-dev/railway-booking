"use client";

import { useState } from "react";
import { AlertCircle, Search, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type PnrResult = { pnr: string; pnrStatus: string; bookingStatus: string; trainNumber: string; trainName: string; origin: string; destination: string; journeyDate: string; passengers: { name: string; coach: string | null; seat: string | null }[] };
const statusClasses: Record<string, string> = { CNF: "bg-emerald-100 text-emerald-800", RAC: "bg-amber-100 text-amber-900", WL: "bg-orange-100 text-orange-800", CAN: "bg-slate-200 text-slate-700" };

export function SearchPnr() {
  const [pnr, setPnr] = useState(""); const [name, setName] = useState(""); const [result, setResult] = useState<PnrResult | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setResult(null);
    try { const response = await fetch("/api/pnr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pnr, passengerName: name }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Lookup failed."); setResult(data.booking); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Lookup failed."); }
    finally { setBusy(false); }
  }
  return <><form onSubmit={submit} className="space-y-5"><div><Label htmlFor="pnr">10-digit demo PNR</Label><Input id="pnr" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} required value={pnr} onChange={(event) => setPnr(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="1234567890" /></div><div><Label htmlFor="passengerName">Passenger full name</Label><Input id="passengerName" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Name used in the booking" /></div>{error && <p role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"><AlertCircle size={16} className="shrink-0" />{error}</p>}<Button className="w-full" type="submit" disabled={busy}>{busy ? "Checking status…" : "Check PNR"}<Search size={16} /></Button></form>{result && <section className="mt-6 rounded-2xl border border-slate-200 p-5 dark:border-slate-700" aria-live="polite"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-slate-400">SIMULATED PNR</p><p className="mt-1 text-xl font-bold tracking-wider">{result.pnr}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusClasses[result.pnrStatus] ?? "bg-slate-100"}`}>{result.pnrStatus} · {result.bookingStatus.replace("_", " ")}</span></div><div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800"><p className="font-semibold">{result.trainName} · {result.trainNumber}</p><p className="mt-2 text-sm">{result.origin} → {result.destination}</p><p className="mt-1 text-xs text-slate-500">{new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full" }).format(new Date(result.journeyDate))}</p>{result.passengers.map((passenger) => <p key={passenger.name} className="mt-3 flex items-center gap-2 text-sm"><Ticket size={15} className="text-orange-600" />{passenger.name}{passenger.coach && passenger.seat ? ` · ${passenger.coach}-${passenger.seat}` : " · Seat not assigned"}</p>)}</div><p className="mt-4 text-[11px] text-slate-400">This result is a simulation and is not railway reservation information.</p></section>}</>;
}
