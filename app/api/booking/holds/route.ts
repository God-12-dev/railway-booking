import { NextResponse } from "next/server";
import { BookingStatus, Prisma, SeatHoldStatus, TravelClass } from "@/app/generated/prisma/client";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const holdSchema = z.object({ scheduleId: z.cuid(), travelClass: z.enum(TravelClass), seatIds: z.array(z.cuid()).min(1).max(6) }).strict().refine((input) => new Set(input.seatIds).size === input.seatIds.length, "Choose each seat only once.");

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to select seats." }, { status: 401 });
  const url = new URL(request.url);
  const scheduleId = url.searchParams.get("scheduleId");
  const travelClass = z.enum(TravelClass).safeParse(url.searchParams.get("class"));
  const schedule = z.cuid().safeParse(scheduleId);
  if (!schedule.success || !travelClass.success) return NextResponse.json({ error: "A valid schedule and travel class are required." }, { status: 400 });
  const map = await getSeatMap(scheduleId!, travelClass.data, user.id).catch(() => null);
  if (!map) return NextResponse.json({ error: "This schedule is no longer available." }, { status: 404 });
  return NextResponse.json(map);
}

import { getSeatMap } from "@/lib/booking/inventory";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to reserve seats." }, { status: 401 });
  const parsed = holdSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose between one and six valid seats." }, { status: 400 });
  const { scheduleId, travelClass, seatIds } = parsed.data;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
  try {
    await prisma.$transaction(async (tx) => {
      const schedule = await tx.trainSchedule.findFirst({ where: { id: scheduleId, isActive: true, departureAt: { gt: now }, train: { isActive: true }, route: { isActive: true } }, select: { id: true, trainId: true } });
      if (!schedule) throw new Error("SCHEDULE_UNAVAILABLE");
      const seats = await tx.seat.findMany({ where: { id: { in: seatIds }, isActive: true, coach: { trainId: schedule.trainId, class: travelClass, isActive: true } }, select: { id: true } });
      if (seats.length !== seatIds.length) throw new Error("SEAT_INVALID");
      await tx.seatHold.updateMany({ where: { scheduleId, status: SeatHoldStatus.ACTIVE, expiresAt: { lte: now } }, data: { status: SeatHoldStatus.EXPIRED } });
      const booked = await tx.bookingSeat.findMany({ where: { scheduleId, seatId: { in: seatIds }, active: true, booking: { status: BookingStatus.CONFIRMED } }, select: { seatId: true } });
      const otherHolds = await tx.seatHold.findMany({ where: { scheduleId, seatId: { in: seatIds }, status: SeatHoldStatus.ACTIVE, expiresAt: { gt: now }, userId: { not: user.id } }, select: { seatId: true } });
      if (booked.length || otherHolds.length) throw new Error("SEAT_TAKEN");
      const priorHolds = await tx.seatHold.findMany({ where: { userId: user.id, scheduleId, status: SeatHoldStatus.ACTIVE }, select: { id: true, bookingId: true } });
      const priorBookingIds = [...new Set(priorHolds.flatMap((hold) => hold.bookingId ? [hold.bookingId] : []))];
      if (priorBookingIds.length) await tx.booking.updateMany({ where: { id: { in: priorBookingIds }, status: BookingStatus.PENDING_PAYMENT }, data: { status: BookingStatus.EXPIRED } });
      await tx.seatHold.updateMany({ where: { userId: user.id, scheduleId, status: SeatHoldStatus.ACTIVE }, data: { status: SeatHoldStatus.RELEASED } });
      await tx.seatHold.createMany({ data: seatIds.map((seatId) => ({ userId: user.id, scheduleId, seatId, expiresAt })) });
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ expiresAt: expiresAt.toISOString(), holdSeconds: 300 });
  } catch (error) {
    if (error instanceof Error && error.message === "SCHEDULE_UNAVAILABLE") return NextResponse.json({ error: "This schedule has departed or is no longer bookable." }, { status: 409 });
    if (error instanceof Error && error.message === "SEAT_INVALID") return NextResponse.json({ error: "One or more seats do not belong to this train class." }, { status: 400 });
    if (error instanceof Error && error.message === "SEAT_TAKEN") return NextResponse.json({ error: "A selected seat has just been booked or held. Refresh availability and choose again." }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) return NextResponse.json({ error: "Seat availability changed. Refresh and choose again." }, { status: 409 });
    console.error("Seat hold failed", error);
    return NextResponse.json({ error: "Seats could not be held right now." }, { status: 500 });
  }
}
