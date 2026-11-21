import { notFound, redirect } from "next/navigation";
import { BookingStatus } from "@/app/generated/prisma/client";
import { PaymentChoice } from "@/components/booking/payment-choice";
import { Card } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
type Search = Promise<{ bookingId?: string }>;

export default async function PaymentPage({ searchParams }: { searchParams: Search }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { bookingId } = await searchParams;
  if (!bookingId) notFound();
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, userId: user.id }, include: { passengers: true, seatHolds: { include: { seat: { include: { coach: true } } } }, schedule: { include: { train: true, route: { include: { origin: true, destination: true } } } } } });
  if (!booking) notFound();
  if (booking.status !== BookingStatus.PENDING_PAYMENT) redirect("/dashboard");
  const seats = booking.seatHolds.filter((hold) => hold.bookingId === booking.id).map((hold) => `${hold.seat.coach.code}-${hold.seat.number}`);
  return <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8"><p className="text-xs font-bold uppercase tracking-[.17em] text-orange-600">Booking · Step 3 of 4</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Review your booking</h1><p className="mt-2 text-sm text-slate-500">This final step uses a simulated payment. No card or bank information is collected.</p><div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]"><Card className="p-6"><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Sample journey</p><h2 className="mt-3 text-xl font-semibold">{booking.schedule.train.name}</h2><p className="mt-1 text-sm text-slate-500">{booking.schedule.train.number} · {booking.class.replace("_", " ")}</p><div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 p-4 dark:bg-slate-950"><span className="font-medium">{booking.schedule.route.origin.name} → {booking.schedule.route.destination.name}</span><span className="text-right text-xs text-slate-500">{new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" }).format(booking.journeyDate)}</span></div><div className="mt-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Passengers and seats</p><div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">{booking.passengers.map((passenger, index) => <div key={passenger.id} className="flex justify-between py-3 text-sm"><span>{passenger.fullName} · {passenger.age}</span><span className="text-slate-500">{seats[index] ?? "Seat held"}</span></div>)}</div></div><div className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-100"><strong>Simulated payment only.</strong> Choose success or failure to test both outcomes. This does not charge money or issue a valid railway ticket.</div></Card><PaymentChoice bookingId={booking.id} fare={{ base: Number(booking.baseFare), fee: Number(booking.convenienceFee), total: Number(booking.totalFare) }} /></div></main>;
}
