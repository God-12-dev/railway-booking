import { redirect } from "next/navigation";
import { BookingStatus, SeatHoldStatus, TravelClass } from "@/app/generated/prisma/client";
import { PassengerForm } from "@/components/booking/passenger-form";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
type Search = Promise<{ scheduleId?: string; class?: string; passengers?: string }>;

export default async function PassengerDetailsPage({ searchParams }: { searchParams: Search }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const query = await searchParams;
  const travelClass = Object.values(TravelClass).includes(query.class as TravelClass) ? query.class as TravelClass : TravelClass.SL;
  const passengerCount = Math.min(6, Math.max(1, Number(query.passengers) || 1));
  if (!query.scheduleId) redirect("/trains/search");
  const schedule = await prisma.trainSchedule.findFirst({ where: { id: query.scheduleId, departureAt: { gt: new Date() }, isActive: true }, include: { train: true, route: { include: { origin: true, destination: true, fares: { where: { class: travelClass } } } } } });
  const holds = await prisma.seatHold.findMany({ where: { userId: user.id, scheduleId: query.scheduleId, status: SeatHoldStatus.ACTIVE, expiresAt: { gt: new Date() }, seat: { coach: { class: travelClass } } }, include: { seat: { include: { coach: true } } } });
  if (!schedule || holds.length !== passengerCount) redirect(`/booking/seats?scheduleId=${query.scheduleId}&class=${travelClass}&passengers=${passengerCount}`);
  if (holds.some((hold) => hold.bookingId)) await prisma.booking.updateMany({ where: { id: { in: holds.flatMap((hold) => hold.bookingId ? [hold.bookingId] : []) }, status: BookingStatus.PENDING_PAYMENT }, data: { status: BookingStatus.EXPIRED } });
  return <PassengerForm schedule={{ id: schedule.id, trainNumber: schedule.train.number, trainName: schedule.train.name, originName: schedule.route.origin.name, destinationName: schedule.route.destination.name, departureAt: schedule.departureAt.toISOString(), travelClass, fare: Number(schedule.route.fares[0]?.amount ?? 0), seats: holds.map((hold) => `${hold.seat.coach.code}-${hold.seat.number}`) }} passengerCount={passengerCount} />;
}
