import { NextResponse } from "next/server";
import { Prisma, SeatBerth, TravelClass } from "@/app/generated/prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const createSchema = z.object({ trainId: z.cuid(), code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{1,8}$/), travelClass: z.enum(TravelClass), seatCount: z.coerce.number().int().min(1).max(200) }).strict();
const patchSchema = z.discriminatedUnion("entity", [z.object({ entity: z.literal("coach"), id: z.cuid(), isActive: z.boolean() }).strict(), z.object({ entity: z.literal("seat"), id: z.cuid(), isActive: z.boolean().optional(), berth: z.enum(SeatBerth).optional(), row: z.number().int().min(1).optional(), column: z.number().int().min(0).max(20).optional() }).strict()]);
const berthPattern = [SeatBerth.LOWER, SeatBerth.MIDDLE, SeatBerth.UPPER, SeatBerth.SIDE_LOWER, SeatBerth.SIDE_UPPER];

export async function GET() {
  try { await requireRole("ADMIN"); const coaches = await prisma.coach.findMany({ include: { train: true, seats: { orderBy: [{ row: "asc" }, { column: "asc" }] } }, orderBy: [{ train: { number: "asc" } }, { code: "asc" }] }); return NextResponse.json({ coaches }); }
  catch (error) { if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 }); console.error(error); return NextResponse.json({ error: "Coach catalog unavailable." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const admin = await requireRole("ADMIN"); const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid coach data." }, { status: 400 });
    const train = await prisma.train.findFirst({ where: { id: parsed.data.trainId, isActive: true }, select: { id: true } });
    if (!train) return NextResponse.json({ error: "Choose an active train." }, { status: 400 });
    const coach = await prisma.$transaction(async (tx) => {
      const created = await tx.coach.create({ data: { trainId: train.id, code: parsed.data.code, class: parsed.data.travelClass } });
      await tx.seat.createMany({ data: Array.from({ length: parsed.data.seatCount }, (_, index) => ({ coachId: created.id, number: String(index + 1), berth: berthPattern[index % berthPattern.length]!, row: Math.floor(index / 6) + 1, column: index % 6 })) });
      await tx.adminLog.create({ data: { adminId: admin.id, action: "CREATE", entityType: "Coach", entityId: created.id, metadata: { seatCount: parsed.data.seatCount } } });
      return created;
    });
    return NextResponse.json({ coach }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "That coach code already exists on this train." }, { status: 409 });
    console.error("Coach creation failed", error); return NextResponse.json({ error: "Coach could not be created." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireRole("ADMIN"); const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid coach or seat update." }, { status: 400 });
    const updated = await prisma.$transaction(async (tx) => {
      const row = parsed.data.entity === "coach" ? await tx.coach.update({ where: { id: parsed.data.id }, data: { isActive: parsed.data.isActive } }) : await tx.seat.update({ where: { id: parsed.data.id }, data: { isActive: parsed.data.isActive, berth: parsed.data.berth, row: parsed.data.row, column: parsed.data.column } });
      await tx.adminLog.create({ data: { adminId: admin.id, action: parsed.data.isActive === false ? "ARCHIVE" : "UPDATE", entityType: parsed.data.entity === "coach" ? "Coach" : "Seat", entityId: parsed.data.id } });
      return row;
    });
    return NextResponse.json({ data: updated });
  } catch (error) { if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 }); console.error(error); return NextResponse.json({ error: "Coach update failed." }, { status: 500 }); }
}
