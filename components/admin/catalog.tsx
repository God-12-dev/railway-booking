"use client";

import { type FormEvent, useCallback, useState } from "react";
import { Archive, Building2, CircleAlert, LoaderCircle, Plus, RefreshCw, TrainFront } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

type Station = { id: string; code: string; name: string; city: string; state: string; isActive: boolean };
type Train = { id: string; number: string; name: string; type: string; isActive: boolean };
type Route = { id: string; distanceKm: number; isActive: boolean; train: Train; origin: Station; destination: Station };
export type CatalogData = { stations: Station[]; trains: Train[]; routes: Route[] };

export function AdminCatalog({ initialData, initialError }: { initialData: CatalogData; initialError?: string }) {
  const [catalog, setCatalog] = useState<CatalogData>(initialData);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(initialError ?? "");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/catalog", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not load the catalog.");
      setCatalog(body);
      setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load the catalog."); }
    finally { setLoading(false); }
  }, []);
  async function send(payload: unknown) {
    setBusy(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/catalog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not save this record.");
      setMessage("Catalog record saved.");
      await refresh();
      return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save this record."); return false; }
    finally { setBusy(false); }
  }

  async function archive(entity: "station" | "train" | "route", id: string) {
    if (!window.confirm("Archive this record? It will remain in historical bookings and can no longer appear in new searches.")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/catalog", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity, id }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not archive this record.");
      setMessage("Record archived. Historical references are preserved.");
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not archive this record."); }
    finally { setBusy(false); }
  }

  async function createStation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const ok = await send({ entity: "station", data: { code: form.get("code"), name: form.get("name"), city: form.get("city"), state: form.get("state"), latitude: numberOrNull(form.get("latitude")), longitude: numberOrNull(form.get("longitude")) } });
    if (ok) event.currentTarget.reset();
  }
  async function createTrain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const ok = await send({ entity: "train", data: { number: form.get("number"), name: form.get("name"), type: form.get("type") } });
    if (ok) event.currentTarget.reset();
  }
  async function createRoute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const originStationId = String(form.get("originStationId")); const destinationStationId = String(form.get("destinationStationId"));
    const origin = catalog.stations.find((station) => station.id === originStationId); const destination = catalog.stations.find((station) => station.id === destinationStationId);
    if (!origin || !destination) { setError("Choose both route stations."); return; }
    const departureAt = localDateTime(String(form.get("journeyDate")), String(form.get("departure")));
    const arrivalAt = localDateTime(String(form.get("journeyDate")), String(form.get("arrival")), String(form.get("arrival")) <= String(form.get("departure")));
    const fares = (["SL", "THREE_AC", "TWO_AC"] as const).flatMap((travelClass) => { const amount = Number(form.get(`fare-${travelClass}`)); return amount > 0 ? [{ class: travelClass, amount }] : []; });
    const ok = await send({ entity: "route", data: { trainId: form.get("trainId"), originStationId, destinationStationId, distanceKm: Number(form.get("distanceKm")), stops: [{ stationId: originStationId, arrivalTime: String(form.get("departure")), departureTime: String(form.get("departure")) }, { stationId: destinationStationId, arrivalTime: String(form.get("arrival")), departureTime: String(form.get("arrival")) }], fares, schedule: { departureAt, arrivalAt, operatingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] } } });
    if (ok) event.currentTarget.reset();
  }

  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.17em] text-orange-600">Administrator workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Rail catalog</h1><p className="mt-2 text-sm text-slate-500">Manage sample stations, trains, and route schedules.</p></div><Button variant="secondary" type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</Button></div>
    {error && <p role="alert" className="mt-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"><CircleAlert size={17} />{error}</p>}{message && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{message}</p>}
    {loading && <p className="mt-6 flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={16} />Loading saved catalog…</p>}
    <div className="mt-7 grid gap-5 lg:grid-cols-2"><Card className="p-5"><div className="flex items-center gap-2"><Building2 size={18} className="text-orange-600" /><h2 className="font-semibold">Add station</h2></div><form onSubmit={createStation} className="mt-4 grid gap-3 sm:grid-cols-2"><Field name="code" label="Station code" required /><Field name="name" label="Station name" required /><Field name="city" label="City" required /><Field name="state" label="State" required /><Field name="latitude" label="Latitude" type="number" step="any" /><Field name="longitude" label="Longitude" type="number" step="any" /><Button className="sm:col-span-2" disabled={busy}><Plus size={16} />Save station</Button></form></Card>
      <Card className="p-5"><div className="flex items-center gap-2"><TrainFront size={18} className="text-orange-600" /><h2 className="font-semibold">Add train</h2></div><form onSubmit={createTrain} className="mt-4 grid gap-3 sm:grid-cols-2"><Field name="number" label="Train number" required /><Field name="name" label="Train name" required /><div className="sm:col-span-2"><Label htmlFor="type">Train type</Label><select id="type" name="type" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="DEMO">Demo</option><option value="EXPRESS">Express</option><option value="SUPERFAST">Superfast</option><option value="MAIL">Mail</option><option value="PASSENGER">Passenger</option></select></div><Button className="sm:col-span-2" disabled={busy}><Plus size={16} />Save train</Button></form></Card>
      <Card className="p-5 lg:col-span-2"><div className="flex items-center gap-2"><RouteIcon /><h2 className="font-semibold">Add route and first schedule</h2></div><form onSubmit={createRoute} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div><Label htmlFor="trainId">Train</Label><select required id="trainId" name="trainId" className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">{catalog.trains.filter((train) => train.isActive).map((train) => <option key={train.id} value={train.id}>{train.number} · {train.name}</option>)}</select></div><StationSelect label="Origin" name="originStationId" stations={catalog.stations} /><StationSelect label="Destination" name="destinationStationId" stations={catalog.stations} /><Field name="distanceKm" label="Distance (km)" type="number" min="1" required /><Field name="journeyDate" label="First service date" type="date" required /><Field name="departure" label="Departure" type="time" required /><Field name="arrival" label="Arrival" type="time" required /><Field name="fare-SL" label="Sleeper fare (₹)" type="number" min="1" required /><Field name="fare-THREE_AC" label="3A fare (₹)" type="number" min="1" /><Field name="fare-TWO_AC" label="2A fare (₹)" type="number" min="1" /><Button className="self-end" disabled={busy || catalog.stations.length < 2 || catalog.trains.length === 0}><Plus size={16} />Save route</Button></form><p className="mt-3 text-xs text-slate-400">This creates endpoint stops and a single first schedule. Add intermediate stops and recurring schedules through later schedule management.</p></Card></div>
    <Card className="mt-6 overflow-hidden"><div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h2 className="font-semibold">Saved stations</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[580px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400 dark:bg-slate-950"><tr><th className="px-5 py-3">Code</th><th className="px-5 py-3">Station</th><th className="px-5 py-3">City, state</th><th className="px-5 py-3">Status</th><th /></tr></thead><tbody>{catalog.stations.map((station) => <tr key={station.id} className="border-t border-slate-100 dark:border-slate-800"><td className="px-5 py-3 font-semibold">{station.code}</td><td className="px-5 py-3">{station.name}</td><td className="px-5 py-3 text-slate-500">{station.city}, {station.state}</td><td className="px-5 py-3">{station.isActive ? "Active" : "Archived"}</td><td className="px-5 py-3 text-right">{station.isActive && <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void archive("station", station.id)}><Archive size={14} />Archive</Button>}</td></tr>)}</tbody></table></div></Card>
    <Card className="mt-5 overflow-hidden"><div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h2 className="font-semibold">Trains and routes</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400 dark:bg-slate-950"><tr><th className="px-5 py-3">Train</th><th className="px-5 py-3">Route</th><th className="px-5 py-3">Distance</th><th className="px-5 py-3">Status</th><th /></tr></thead><tbody>{catalog.routes.map((route) => <tr key={route.id} className="border-t border-slate-100 dark:border-slate-800"><td className="px-5 py-3"><span className="font-semibold">{route.train.number}</span><span className="ml-2 text-slate-500">{route.train.name}</span></td><td className="px-5 py-3">{route.origin.code} → {route.destination.code}</td><td className="px-5 py-3">{route.distanceKm} km</td><td className="px-5 py-3">{route.isActive ? "Active" : "Archived"}</td><td className="px-5 py-3 text-right">{route.isActive && <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void archive("route", route.id)}><Archive size={14} />Archive</Button>}</td></tr>)}</tbody></table></div></Card>
  </main>;
}

function Field({ name, label, type = "text", ...props }: { name: string; label: string; type?: string; required?: boolean; min?: string; step?: string }) { return <div><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type={type} {...props} /></div>; }
function StationSelect({ label, name, stations }: { label: string; name: string; stations: Station[] }) { return <div><Label htmlFor={name}>{label}</Label><select required id={name} name={name} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950">{stations.filter((station) => station.isActive).map((station) => <option key={station.id} value={station.id}>{station.city} · {station.code}</option>)}</select></div>; }
function RouteIcon() { return <TrainFront size={18} className="text-orange-600" />; }
function numberOrNull(value: FormDataEntryValue | null) { const parsed = Number(value); return Number.isFinite(parsed) && String(value).trim() !== "" ? parsed : null; }
function localDateTime(date: string, time: string, nextDay = false) { const value = new Date(`${date}T${time}:00`); if (nextDay) value.setDate(value.getDate() + 1); return value.toISOString(); }
