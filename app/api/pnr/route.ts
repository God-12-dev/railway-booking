import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const lookupSchema = z.object({ pnr: z.string().trim().regex(/^\d{10}$/), passengerName: z.string().trim().min(2).max(80) }).strict();

export async function POST(request: Request) {
  const parsed = lookupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the 10-digit demo PNR and a passenger name." }, { status: 400 });
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown-client";
  const ipHash = createHash("sha256").update(ip).digest("hex");
  const now = new Date(); const since = new Date(now.getTime() - 15 * 60 * 1000);
  try {
    await prisma.pnrLookupAttempt.deleteMany({ where: { attemptedAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } });
    const attemptCount = await prisma.pnrLookupAttempt.count({ where: { ipHash, attemptedAt: { gte: since } } });
    if (attemptCount >= 20) return NextResponse.json({ error: "Too many lookups. Please try again in 15 minutes." }, { status: 429 });
    await prisma.pnrLookupAttempt.create({ data: { ipHash } });
    const booking = await prisma.booking.findFirst({
      where: { pnr: parsed.data.pnr, passengers: { some: { fullName: { equals: parsed.data.passengerName, mode: "insensitive" } } } },
      include: {
        schedule: { include: { train: true, route: { include: { origin: true, destination: true } } } },
        passengers: { where: { fullName: { equals: parsed.data.passengerName, mode: "insensitive" } }, include: { seat: { include: { seat: { include: { coach: true } } } } } },
      },
    });
    if (!booking) return NextResponse.json({ error: "No matching demo booking was found. Check the PNR and passenger name." }, { status: 404 });
    return NextResponse.json({ booking: { pnr: booking.pnr, pnrStatus: booking.pnrStatus, bookingStatus: booking.status, trainNumber: booking.schedule.train.number, trainName: booking.schedule.train.name, origin: booking.schedule.route.origin.name, destination: booking.schedule.route.destination.name, journeyDate: booking.journeyDate.toISOString(), passengers: booking.passengers.map((passenger) => ({ name: passenger.fullName, coach: passenger.seat?.seat.coach.code ?? null, seat: passenger.seat?.seat.number ?? null })) } });
  } catch (error) {
    console.error("PNR lookup failed", error);
    return NextResponse.json({ error: "PNR status is temporarily unavailable." }, { status: 503 });
  }
}
