"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Armchair, ArrowRight, CircleAlert, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SeatMapItem } from "@/lib/booking/inventory";

type SeatMap = { scheduleId: string; trainNumber: string; trainName: string; travelClass: string; departureAt: string; originName: string; destinationName: string; fare: number; coaches: { id: string; code: string; seats: SeatMapItem[] }[] };
const statusClass = {
  AVAILABLE: "border-slate-200 bg-white text-slate-700 hover:border-orange-400 hover:bg-orange-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-orange-950/50",
  BOOKED: "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-600",
  HELD: "cursor-not-allowed border-amber-200 bg-amber-100 text-amber-600 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-400",
  MINE: "border-orange-500 bg-orange-500 text-slate-950",
  SELECTED: "border-blue-950 bg-blue-950 text-white ring-2 ring-blue-200 dark:border-blue-300 dark:bg-blue-300 dark:text-slate-950 dark:ring-blue-900",
};

export function SeatPicker({ map, passengerCount }: { map: SeatMap; passengerCount: number }) {
  const router = useRouter();
  const initiallyHeld = useMemo(() => map.coaches.flatMap((coach) => coach.seats.filter((seat) => seat.status === "MINE").map((seat) => seat.id)), [map.coaches]);
  const [selected, setSelected] = useState<string[]>(initiallyHeld);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");

  function toggle(seat: SeatMapItem) {
    if (seat.status !== "AVAILABLE" && seat.status !== "MINE") return;
    setError("");
    setSelected((current) => current.includes(seat.id) ? current.filter((id) => id !== seat.id) : current.length < passengerCount ? [...current, seat.id] : current);
  }

  async function holdSeats() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/booking/holds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scheduleId: map.scheduleId, travelClass: map.travelClass, seatIds: selected }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not reserve those seats.");
      setExpiresAt(result.expiresAt);
      router.push(`/booking/passengers?scheduleId=${map.scheduleId}&class=${map.travelClass}&passengers=${passengerCount}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not reserve those seats."); }
    finally { setBusy(false); }
  }

  const selectedSeats = map.coaches.flatMap((coach) => coach.seats.filter((seat) => selected.includes(seat.id)));
  return <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8"><p className="text-xs font-bold uppercase tracking-[.17em] text-orange-600">Booking · Step 1 of 4</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Choose your seats</h1><p className="mt-2 text-sm text-slate-500">{map.trainNumber} · {map.trainName} · {map.originName} to {map.destinationName}</p>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]"><div className="space-y-5">{map.coaches.map((coach) => <Card key={coach.id} className="overflow-hidden"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div><h2 className="font-semibold">Coach {coach.code}</h2><p className="text-xs text-slate-400">{map.travelClass.replace("_", " ")} · {coach.seats.length} berths</p></div><Badge>Sample coach</Badge></div><div className="overflow-x-auto p-5"><div className="mx-auto min-w-[420px] max-w-xl rounded-2xl border-2 border-slate-200 p-4 dark:border-slate-700"><div className="mb-4 flex items-center justify-between text-xs text-slate-400"><span>← Coach entrance</span><span className="inline-flex items-center gap-1"><Armchair size={14} />Coach {coach.code}</span></div><div className="grid grid-cols-6 gap-2 sm:gap-3">{coach.seats.map((seat) => { const chosen = selected.includes(seat.id); const state = chosen ? "SELECTED" : seat.status === "MINE" ? "AVAILABLE" : seat.status; return <button key={seat.id} type="button" disabled={seat.status === "BOOKED" || seat.status === "HELD"} aria-label={`${coach.code} seat ${seat.number}, ${seat.berth.toLowerCase()}, ${chosen ? "selected" : seat.status.toLowerCase()}`} aria-pressed={chosen} onClick={() => toggle(seat)} className={`grid aspect-square min-w-10 place-items-center rounded-lg border text-xs font-semibold transition ${statusClass[state]}`}><span>{seat.number}</span></button>; })}</div><div className="mt-4 flex justify-between text-[10px] uppercase tracking-wider text-slate-400"><span>Window</span><span>Aisle</span><span>Aisle</span><span>Window</span></div></div></div></Card>)}</div>
      <aside className="lg:sticky lg:top-24 lg:self-start"><Card className="p-5"><h2 className="font-semibold">Seat legend</h2><div className="mt-4 space-y-3 text-sm">{[["AVAILABLE", "Available"], ["SELECTED", "Selected by you"], ["BOOKED", "Booked"], ["HELD", "Held by another traveler"]].map(([key, label]) => <div className="flex items-center gap-2.5" key={key}><span className={`size-5 rounded-md border ${statusClass[key as keyof typeof statusClass]}`} />{label}</div>)}</div><div className="my-5 border-t border-slate-100 dark:border-slate-800" /><div className="flex justify-between text-sm"><span className="text-slate-500">Passengers</span><strong>{passengerCount}</strong></div><div className="mt-2 flex justify-between text-sm"><span className="text-slate-500">Selected</span><strong>{selected.length} / {passengerCount}</strong></div><div className="mt-2 flex justify-between text-sm"><span className="text-slate-500">Fare per passenger</span><strong>₹{map.fare.toLocaleString("en-IN")}</strong></div><div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><p className="text-xs font-semibold text-slate-500">Your seats</p><p className="mt-1 text-sm">{selectedSeats.length ? selectedSeats.map((seat) => `${seat.coachCode}-${seat.number}`).join(", ") : "Choose seats from the coach"}</p></div>{error && <p role="alert" className="mt-4 flex gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950/50 dark:text-red-200"><CircleAlert size={15} className="shrink-0" />{error}</p>}{expiresAt && <p className="mt-3 inline-flex items-center gap-1 text-xs text-amber-700"><Clock3 size={14} />Held until {new Date(expiresAt).toLocaleTimeString()}</p>}<Button className="mt-5 w-full" disabled={busy || selected.length !== passengerCount} onClick={() => void holdSeats()}>{busy ? "Checking availability…" : "Hold seats and continue"}<ArrowRight size={16} /></Button><p className="mt-3 text-center text-[11px] leading-5 text-slate-400">A temporary 5-minute hold is checked against live database inventory.</p></Card></aside>
    </div>
  </main>;
}
