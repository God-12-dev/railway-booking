import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { BookingStatus, PaymentStatus, PnrStatus, SeatHoldStatus, Prisma } from "@/app/generated/prisma/client";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { simulatedPaymentSchema } from "@/lib/booking/schemas";
import { assignPassengerSeats } from "@/lib/booking/seat-assignment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to complete this booking." }, { status: 401 });
  const parsed = simulatedPaymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid simulated payment request." }, { status: 400 });
  const { bookingId, outcome } = parsed.data;
  const now = new Date();
  try {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({ where: { id: bookingId, userId: user.id }, include: { passengers: { orderBy: { createdAt: "asc" } }, schedule: true } });
      if (!booking) throw new Error("BOOKING_NOT_FOUND");
      if (booking.status !== BookingStatus.PENDING_PAYMENT) throw new Error("BOOKING_NOT_PENDING");
      const holds = await tx.seatHold.findMany({ where: { bookingId, userId: user.id, scheduleId: booking.scheduleId, status: SeatHoldStatus.ACTIVE, expiresAt: { gt: now }, seat: { coach: { class: booking.class } } }, include: { seat: true }, orderBy: [{ createdAt: "asc" }, { seatId: "asc" }] });
      if (holds.length !== booking.passengerCount) throw new Error("HOLD_EXPIRED");
      if (outcome === "FAILURE") {
        await tx.payment.create({ data: { bookingId, amount: booking.totalFare, status: PaymentStatus.FAILED, providerRef: `SIM-${randomUUID()}` } });
        await tx.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.PAYMENT_FAILED } });
        await tx.seatHold.updateMany({ where: { bookingId, userId: user.id, status: SeatHoldStatus.ACTIVE }, data: { status: SeatHoldStatus.RELEASED } });
        return { success: false, pnr: booking.pnr };
      }
      if (booking.schedule.departureAt <= now) throw new Error("JOURNEY_STARTED");
      const assignments = assignPassengerSeats(booking.passengers.map((passenger) => ({ passengerId: passenger.id, seatPreference: passenger.seatPreference })), holds.map((hold) => ({ seatId: hold.seatId, berth: hold.seat.berth })));
      const createdSeats = await tx.bookingSeat.createMany({ data: assignments.map((assignment) => ({ bookingId, passengerId: assignment.passengerId, seatId: assignment.seatId, scheduleId: booking.scheduleId })) });
      if (createdSeats.count !== booking.passengerCount) throw new Error("SEAT_ASSIGNMENT_FAILED");
      await tx.payment.create({ data: { bookingId, amount: booking.totalFare, status: PaymentStatus.SUCCEEDED, providerRef: `SIM-${randomUUID()}` } });
      await tx.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.CONFIRMED, pnrStatus: PnrStatus.CNF } });
      await tx.seatHold.updateMany({ where: { bookingId, userId: user.id, status: SeatHoldStatus.ACTIVE }, data: { status: SeatHoldStatus.CONVERTED } });
      await tx.notification.create({ data: { userId: user.id, title: "Demo booking confirmed", body: `Your simulated booking ${booking.pnr} is confirmed. This is not a valid railway ticket.` } });
      return { success: true, pnr: booking.pnr };
    }, { isolationLevel: "Serializable" });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "BOOKING_NOT_FOUND") return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (message === "BOOKING_NOT_PENDING") return NextResponse.json({ error: "This booking is no longer awaiting payment." }, { status: 409 });
    if (message === "HOLD_EXPIRED") return NextResponse.json({ error: "The seat hold expired. Start a new booking." }, { status: 409 });
    if (message === "JOURNEY_STARTED") return NextResponse.json({ error: "This journey has already started." }, { status: 409 });
    if (error instanceof RangeError) return NextResponse.json({ error: "The selected seats do not satisfy every passenger's berth preference. Update passenger preferences or choose different seats." }, { status: 409 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) return NextResponse.json({ error: "Seat availability changed during payment. Please check your bookings." }, { status: 409 });
    console.error("Simulated payment failed", error);
    return NextResponse.json({ error: "The simulated payment could not be completed." }, { status: 500 });
  }
}
