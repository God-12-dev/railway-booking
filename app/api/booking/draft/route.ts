import { randomBytes, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { BookingStatus, PnrStatus, SeatHoldStatus, TravelClass } from "@/app/generated/prisma/client";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { draftBookingSchema } from "@/lib/booking/schemas";
import { calculateFare } from "@/lib/booking/pricing";

export const runtime = "nodejs";
function pnr() { return String(randomInt(0, 10_000_000_000)).padStart(10, "0"); }
function reference() { return randomBytes(8).toString("hex").toUpperCase(); }

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue booking." }, { status: 401 });
  const parsed = draftBookingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter valid details for every passenger." }, { status: 400 });
  const { scheduleId, passengers } = parsed.data;
  const travelClass = Object.values(TravelClass).find((value) => value === parsed.data.travelClass);
  if (!travelClass) return NextResponse.json({ error: "Choose a valid travel class." }, { status: 400 });
  const now = new Date();
  try {
    const booking = await prisma.$transaction(async (tx) => {
      const schedule = await tx.trainSchedule.findFirst({ where: { id: scheduleId, isActive: true, departureAt: { gt: now }, train: { isActive: true }, route: { isActive: true } }, include: { route: { include: { origin: true, destination: true, fares: { where: { class: travelClass } } } } } });
      if (!schedule) throw new Error("SCHEDULE_UNAVAILABLE");
      const holds = await tx.seatHold.findMany({ where: { scheduleId, userId: user.id, status: SeatHoldStatus.ACTIVE, expiresAt: { gt: now }, seat: { isActive: true, coach: { class: travelClass, isActive: true } } }, orderBy: [{ createdAt: "asc" }, { seatId: "asc" }] });
      if (holds.length !== passengers.length) throw new Error("HOLD_MISMATCH");
      const priorBookingIds = [...new Set(holds.flatMap((hold) => hold.bookingId ? [hold.bookingId] : []))];
      if (priorBookingIds.length) await tx.booking.updateMany({ where: { id: { in: priorBookingIds }, status: BookingStatus.PENDING_PAYMENT }, data: { status: BookingStatus.EXPIRED } });
      const unitFare = schedule.route.fares[0]?.amount;
      if (!unitFare) throw new Error("FARE_UNAVAILABLE");
      const quote = calculateFare(Number(unitFare), passengers.length);
      const row = await tx.booking.create({
        data: {
          reference: reference(), pnr: pnr(), pnrStatus: PnrStatus.WL, status: BookingStatus.PENDING_PAYMENT,
          userId: user.id, scheduleId, originCode: schedule.route.origin.code, destinationCode: schedule.route.destination.code,
          journeyDate: schedule.departureAt, class: travelClass, passengerCount: passengers.length,
          baseFare: quote.baseFare, convenienceFee: quote.convenienceFee, totalFare: quote.totalFare,
          passengers: { create: passengers.map((passenger) => ({ ...passenger, seatPreference: passenger.seatPreference })) },
        },
        select: { id: true, reference: true, pnr: true, totalFare: true },
      });
      await tx.seatHold.updateMany({ where: { id: { in: holds.map((hold) => hold.id) }, userId: user.id, status: SeatHoldStatus.ACTIVE }, data: { bookingId: row.id } });
      return row;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ bookingId: booking.id, reference: booking.reference, pnr: booking.pnr, totalFare: Number(booking.totalFare) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "SCHEDULE_UNAVAILABLE") return NextResponse.json({ error: "This train is no longer bookable." }, { status: 409 });
    if (message === "HOLD_MISMATCH") return NextResponse.json({ error: "Your seat hold expired or does not match the passenger count. Select seats again." }, { status: 409 });
    if (message === "FARE_UNAVAILABLE") return NextResponse.json({ error: "The fare for this class is unavailable." }, { status: 409 });
    console.error("Booking draft creation failed", error);
    return NextResponse.json({ error: "The booking could not be prepared." }, { status: 500 });
  }
}
