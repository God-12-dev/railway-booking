import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock3, MapPin, TrainFront } from "lucide-react";
import { BookingStatus, SeatHoldStatus, TravelClass } from "@/app/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
type Params = Promise<{ trainNumber: string }>;
type Query = Promise<{ scheduleId?: string; class?: string; passengers?: string }>;
const time = (value: Date) => new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true }).format(value);

export default async function TrainDetailsPage({ params, searchParams }: { params: Params; searchParams: Query }) {
  const [{ trainNumber }, query] = await Promise.all([params, searchParams]);
  const classValue = Object.values(TravelClass).includes(query.class as TravelClass) ? query.class as TravelClass : TravelClass.SL;
  const passengerCount = Math.min(6, Math.max(1, Number(query.passengers) || 1));
  if (!query.scheduleId) notFound();
  const schedule = await prisma.trainSchedule.findFirst({
    where: { id: query.scheduleId, train: { number: trainNumber, isActive: true }, route: { isActive: true }, isActive: true },
    include: { route: { include: { origin: true, destination: true, stops: { include: { station: true }, orderBy: { stopOrder: "asc" } }, fares: { where: { class: classValue } } } }, train: { include: { coaches: { where: { class: classValue, isActive: true }, include: { _count: { select: { seats: { where: { isActive: true } } } } } } } } },
  }).catch(() => null);
  if (!schedule) notFound();
  const [bookedCount, holdCount] = await Promise.all([
    prisma.bookingSeat.count({ where: { scheduleId: schedule.id, active: true, seat: { coach: { class: classValue } }, booking: { status: BookingStatus.CONFIRMED } } }),
    prisma.seatHold.count({ where: { scheduleId: schedule.id, seat: { coach: { class: classValue } }, status: SeatHoldStatus.ACTIVE, expiresAt: { gt: new Date() } } }),
  ]);
  const totalSeats = schedule.train.coaches.reduce((sum, coach) => sum + coach._count.seats, 0);
  const fare = Number(schedule.route.fares[0]?.amount ?? 0);
  const durationMinutes = Math.round((schedule.arrivalAt.getTime() - schedule.departureAt.getTime()) / 60000);
  return <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8"><Link href={`/trains/search?from=${schedule.route.origin.code}&to=${schedule.route.destination.code}&date=${schedule.departureAt.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })}&class=${classValue}`} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-950 dark:hover:text-white"><ArrowLeft size={16} />Back to sample results</Link>
    <Card className="mt-5 overflow-hidden rounded-3xl"><div className="bg-[#0b1834] p-6 text-white sm:p-9"><div className="flex flex-wrap items-start justify-between gap-4"><div><Badge className="bg-white/10 text-orange-200">{schedule.train.type} · SAMPLE TRAIN</Badge><h1 className="mt-4 text-3xl font-semibold tracking-tight">{schedule.train.name}</h1><p className="mt-2 text-sm text-slate-300">{schedule.train.number} · {classValue.replace("_", " ")}</p></div><div className="grid size-12 place-items-center rounded-2xl bg-white/10 text-orange-300"><TrainFront size={25} /></div></div><div className="mt-8 grid items-center gap-5 sm:grid-cols-[1fr_auto_1fr]"><div><p className="text-3xl font-semibold">{time(schedule.departureAt)}</p><p className="mt-2 text-sm text-slate-300">{schedule.route.origin.name} · {schedule.route.origin.code}</p></div><div className="flex items-center gap-2 text-xs text-slate-400"><span className="h-px w-10 bg-white/20" /><Clock3 size={15} />{Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m<span className="h-px w-10 bg-white/20" /></div><div className="sm:text-right"><p className="text-3xl font-semibold">{time(schedule.arrivalAt)}</p><p className="mt-2 text-sm text-slate-300">{schedule.route.destination.name} · {schedule.route.destination.code}</p></div></div></div>
      <div className="grid gap-0 lg:grid-cols-[1fr_300px]"><div className="p-6 sm:p-9"><h2 className="text-lg font-semibold text-slate-950 dark:text-white">Sample schedule</h2><p className="mt-1 text-sm text-slate-500">{new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full" }).format(schedule.departureAt)}</p><div className="mt-6 space-y-0">{schedule.route.stops.map((stop, index) => <div key={stop.id} className="relative flex gap-4 pb-7 last:pb-0"><div className="relative flex w-5 justify-center"><span className={`z-10 mt-1.5 size-3 rounded-full border-2 ${index === 0 || index === schedule.route.stops.length - 1 ? "border-orange-500 bg-orange-500" : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"}`} />{index < schedule.route.stops.length - 1 && <span className="absolute top-4 h-full w-px bg-slate-200 dark:bg-slate-700" />}</div><div className="flex flex-1 items-start justify-between gap-4"><div><p className="font-medium text-slate-900 dark:text-slate-100">{stop.station.name}</p><p className="mt-1 text-xs text-slate-400">{stop.station.code}</p></div><p className="text-sm text-slate-500">{index === 0 ? time(schedule.departureAt) : index === schedule.route.stops.length - 1 ? time(schedule.arrivalAt) : stop.arrivalTime}</p></div></div>)}</div></div>
        <aside className="border-t border-slate-100 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/50 lg:border-l lg:border-t-0"><p className="text-xs font-bold uppercase tracking-[.15em] text-slate-400">Fare & availability</p><p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">₹{fare.toLocaleString("en-IN")}<span className="text-sm font-normal text-slate-400"> / passenger</span></p><p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">{Math.max(0, totalSeats - bookedCount - holdCount)} of {totalSeats} seats available</p><div className="my-5 border-t border-slate-200 dark:border-slate-700" /><div className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-slate-500">Distance</span><span>{schedule.route.distanceKm} km</span></div><div className="flex justify-between"><span className="text-slate-500">Journey time</span><span>{Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m</span></div><div className="flex justify-between"><span className="text-slate-500">Seat class</span><span>{classValue.replace("_", " ")}</span></div></div>{totalSeats - bookedCount - holdCount >= passengerCount ? <Button asChild className="mt-6 w-full"><Link href={`/booking/seats?scheduleId=${schedule.id}&class=${classValue}&passengers=${passengerCount}`}>Choose seats<ArrowRight size={16} /></Link></Button> : <Button type="button" disabled className="mt-6 w-full">Not enough seats</Button>}<p className="mt-3 text-center text-xs leading-5 text-slate-400">Seat availability is rechecked before any temporary hold.</p></aside></div>
    </Card><p className="mt-5 flex items-center gap-2 text-xs text-slate-400"><MapPin size={14} />Route, timetable, and availability are simulated sample data.</p>
  </main>;
}
