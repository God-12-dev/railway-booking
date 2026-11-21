import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { cancelBooking } from "@/lib/booking/cancel-booking";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireRole("ADMIN");
    const bookings = await prisma.booking.findMany({ include: { user: { select: { name: true, email: true } }, schedule: { include: { train: true, route: { include: { origin: true, destination: true } } } }, passengers: true, seats: { include: { seat: { include: { coach: true } } } }, payments: true, cancellation: true }, orderBy: { createdAt: "desc" }, take: 500 });
    return NextResponse.json({ bookings });
  } catch (error) { if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 }); console.error(error); return NextResponse.json({ error: "Booking list unavailable." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireRole("ADMIN"); const parsed = z.object({ bookingId: z.cuid(), reason: z.string().trim().max(300).optional() }).strict().safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid booking action." }, { status: 400 });
    return NextResponse.json(await cancelBooking({ ...parsed.data, adminId: admin.id }));
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    if (error instanceof Error && error.message === "BOOKING_NOT_FOUND") return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (error instanceof Error && error.message === "NOT_CANCELLABLE") return NextResponse.json({ error: "Only confirmed journeys that have not departed can be cancelled." }, { status: 409 });
    console.error("Admin booking action failed", error); return NextResponse.json({ error: "Booking action failed." }, { status: 500 });
  }
}
