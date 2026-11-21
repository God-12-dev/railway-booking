import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const createSchema = z.object({ routeId: z.cuid(), departureAt: z.iso.datetime(), arrivalAt: z.iso.datetime(), operatingDays: z.array(z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"])).min(1) }).strict().refine((value) => new Date(value.arrivalAt) > new Date(value.departureAt), "Arrival must be later than departure.");
const patchSchema = z.object({ id: z.cuid(), data: z.object({ isActive: z.boolean().optional(), departureAt: z.iso.datetime().optional(), arrivalAt: z.iso.datetime().optional(), operatingDays: z.array(z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"])).min(1).optional() }).strict() }).strict();

function responseError(error: unknown) {
  if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "That train already has a schedule at this time." }, { status: 409 });
  console.error("Schedule admin action failed", error);
  return NextResponse.json({ error: "Schedule management is temporarily unavailable." }, { status: 500 });
}

export async function GET() {
  try { await requireRole("ADMIN"); const [schedules, routes] = await Promise.all([prisma.trainSchedule.findMany({ include: { train: true, route: { include: { origin: true, destination: true } } }, orderBy: { departureAt: "desc" }, take: 250 }), prisma.trainRoute.findMany({ where: { isActive: true, train: { isActive: true } }, include: { train: true, origin: true, destination: true }, orderBy: [{ train: { number: "asc" } }] })]); return NextResponse.json({ schedules, routes }); }
  catch (error) { return responseError(error); }
}

export async function POST(request: Request) {
  try {
    const admin = await requireRole("ADMIN"); const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid schedule data.", details: parsed.error.flatten() }, { status: 400 });
    const route = await prisma.trainRoute.findFirst({ where: { id: parsed.data.routeId, isActive: true, train: { isActive: true } }, select: { id: true, trainId: true } });
    if (!route) return NextResponse.json({ error: "Choose an active route." }, { status: 400 });
    const schedule = await prisma.$transaction(async (tx) => {
      const created = await tx.trainSchedule.create({ data: { routeId: route.id, trainId: route.trainId, departureAt: new Date(parsed.data.departureAt), arrivalAt: new Date(parsed.data.arrivalAt), operatingDays: parsed.data.operatingDays } });
      await tx.adminLog.create({ data: { adminId: admin.id, action: "CREATE", entityType: "TrainSchedule", entityId: created.id } });
      return created;
    });
    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) { return responseError(error); }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireRole("ADMIN"); const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid schedule update." }, { status: 400 });
    const data = { ...parsed.data.data, ...(parsed.data.data.departureAt ? { departureAt: new Date(parsed.data.data.departureAt) } : {}), ...(parsed.data.data.arrivalAt ? { arrivalAt: new Date(parsed.data.data.arrivalAt) } : {}) };
    if (data.departureAt && data.arrivalAt && data.arrivalAt <= data.departureAt) return NextResponse.json({ error: "Arrival must be later than departure." }, { status: 400 });
    const updated = await prisma.$transaction(async (tx) => {
      const schedule = await tx.trainSchedule.update({ where: { id: parsed.data.id }, data });
      await tx.adminLog.create({ data: { adminId: admin.id, action: data.isActive === false ? "ARCHIVE" : "UPDATE", entityType: "TrainSchedule", entityId: schedule.id } });
      return schedule;
    });
    return NextResponse.json({ schedule: updated });
  } catch (error) { return responseError(error); }
}
