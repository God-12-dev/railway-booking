import { BookingStatus, PaymentStatus, PnrStatus, SeatHoldStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateSimulatedRefund } from "@/lib/booking/pricing";

export async function cancelBooking({ bookingId, userId, adminId, reason }: { bookingId: string; userId?: string; adminId?: string; reason?: string }) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({ where: { id: bookingId, ...(userId ? { userId } : {}) }, include: { schedule: true } });
    if (!booking) throw new Error("BOOKING_NOT_FOUND");
    if (booking.status === BookingStatus.CANCELLED) {
      const existing = await tx.cancellation.findUnique({ where: { bookingId } });
      return { cancelled: true, refund: Number(existing?.refundAmount ?? 0), alreadyCancelled: true };
    }
    if (booking.status !== BookingStatus.CONFIRMED || booking.schedule.departureAt <= now) throw new Error("NOT_CANCELLABLE");
    const hoursUntilDeparture = (booking.schedule.departureAt.getTime() - now.getTime()) / 3_600_000;
    const refundAmount = calculateSimulatedRefund(Number(booking.totalFare), hoursUntilDeparture);
    await tx.bookingSeat.updateMany({ where: { bookingId, active: true }, data: { active: false } });
    await tx.seatHold.updateMany({ where: { bookingId, status: SeatHoldStatus.ACTIVE }, data: { status: SeatHoldStatus.RELEASED } });
    await tx.payment.updateMany({ where: { bookingId, status: PaymentStatus.SUCCEEDED }, data: { status: PaymentStatus.REFUNDED } });
    await tx.cancellation.create({ data: { bookingId, reason, refundAmount, refundSimulated: true } });
    await tx.booking.update({ where: { id: bookingId }, data: { status: BookingStatus.CANCELLED, pnrStatus: PnrStatus.CAN } });
    await tx.notification.create({ data: { userId: booking.userId, title: "Demo booking cancelled", body: `Booking ${booking.pnr} was cancelled. Simulated refund: ₹${refundAmount.toFixed(2)}.` } });
    if (adminId) await tx.adminLog.create({ data: { adminId, action: "CANCEL", entityType: "Booking", entityId: bookingId, metadata: { reason, refundAmount } } });
    return { cancelled: true, refund: refundAmount, alreadyCancelled: false };
  }, { isolationLevel: "Serializable" });
}
