import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { BookingStatus } from "@/app/generated/prisma/client";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { buildTicketDocument } from "@/lib/tickets/pdf-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to download this ticket." }, { status: 401 });
  const { bookingId } = await params;
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, userId: user.id, status: BookingStatus.CONFIRMED }, include: { schedule: { include: { train: true, route: { include: { origin: true, destination: true } } } }, passengers: { orderBy: { createdAt: "asc" } }, seats: { where: { active: true }, include: { seat: { include: { coach: true } } } } } });
  if (!booking) return NextResponse.json({ error: "Confirmed ticket not found." }, { status: 404 });
  const assigned = new Map(booking.seats.map((entry) => [entry.passengerId, entry]));
  const qrDataUrl = await QRCode.toDataURL(`RAILCONNECT-DEMO|PNR:${booking.pnr}|REF:${booking.reference}`, { margin: 1, width: 240, errorCorrectionLevel: "M" });
  const ticket = {
    reference: booking.reference, pnr: booking.pnr, pnrStatus: booking.pnrStatus, status: booking.status,
    trainNumber: booking.schedule.train.number, trainName: booking.schedule.train.name,
    journeyDate: booking.journeyDate, departureAt: booking.schedule.departureAt, arrivalAt: booking.schedule.arrivalAt,
    origin: booking.schedule.route.origin.name, destination: booking.schedule.route.destination.name,
    travelClass: booking.class, baseFare: Number(booking.baseFare), fee: Number(booking.convenienceFee),
    totalFare: Number(booking.totalFare), qrDataUrl,
    passengers: booking.passengers.map((passenger) => {
      const seat = assigned.get(passenger.id);
      return { name: passenger.fullName, age: passenger.age, gender: passenger.gender, coach: seat?.seat.coach.code ?? "—", seat: seat?.seat.number ?? "—" };
    }),
  };
  const buffer = await renderToBuffer(buildTicketDocument(ticket));
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="railconnect-${booking.pnr}.pdf"`, "Cache-Control": "private, no-store" } });
}
