import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";
import { archiveCatalogSchema, createCatalogSchema, patchCatalogSchema } from "@/lib/admin/schemas";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "A record with that unique value already exists." }, { status: 409 });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return NextResponse.json({ error: "This record is referenced by other catalog data." }, { status: 409 });
  console.error("Admin catalog request failed", error);
  return NextResponse.json({ error: "The catalog request could not be completed." }, { status: 500 });
}

export async function GET() {
  try {
    await requireRole("ADMIN");
    const [stations, trains, routes] = await Promise.all([
      prisma.station.findMany({ orderBy: [{ city: "asc" }, { name: "asc" }] }),
      prisma.train.findMany({ orderBy: { number: "asc" } }),
      prisma.trainRoute.findMany({ include: { train: true, origin: true, destination: true, fares: true, stops: { include: { station: true }, orderBy: { stopOrder: "asc" } }, schedules: true }, orderBy: { train: { number: "asc" } } }),
    ]);
    return NextResponse.json({ stations, trains, routes });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const admin = await requireRole("ADMIN");
    const parsed = createCatalogSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid catalog data.", details: parsed.error.flatten() }, { status: 400 });
    const input = parsed.data;
    const result = await prisma.$transaction(async (tx) => {
      if (input.entity === "station") {
        const station = await tx.station.create({ data: input.data });
        await tx.adminLog.create({ data: { adminId: admin.id, action: "CREATE", entityType: "Station", entityId: station.id, metadata: { code: station.code } } });
        return station;
      }
      if (input.entity === "train") {
        const train = await tx.train.create({ data: input.data });
        await tx.adminLog.create({ data: { adminId: admin.id, action: "CREATE", entityType: "Train", entityId: train.id, metadata: { number: train.number } } });
        return train;
      }
      const value = input.data;
      const route = await tx.trainRoute.create({ data: { trainId: value.trainId, originStationId: value.originStationId, destinationStationId: value.destinationStationId, distanceKm: value.distanceKm } });
      await tx.trainStop.createMany({ data: value.stops.map((stop, index) => ({ ...stop, routeId: route.id, stopOrder: index })) });
      await tx.trainFare.createMany({ data: value.fares.map((fare) => ({ ...fare, routeId: route.id })) });
      await tx.trainSchedule.create({ data: { ...value.schedule, departureAt: new Date(value.schedule.departureAt), arrivalAt: new Date(value.schedule.arrivalAt), trainId: value.trainId, routeId: route.id } });
      await tx.adminLog.create({ data: { adminId: admin.id, action: "CREATE", entityType: "TrainRoute", entityId: route.id } });
      return route;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireRole("ADMIN");
    const parsed = patchCatalogSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid catalog data.", details: parsed.error.flatten() }, { status: 400 });
    const input = parsed.data;
    const result = await prisma.$transaction(async (tx) => {
      let updated;
      if (input.entity === "station") updated = await tx.station.update({ where: { id: input.id }, data: input.data });
      else if (input.entity === "train") updated = await tx.train.update({ where: { id: input.id }, data: input.data });
      else updated = await tx.trainRoute.update({ where: { id: input.id }, data: input.data });
      await tx.adminLog.create({ data: { adminId: admin.id, action: "UPDATE", entityType: input.entity === "route" ? "TrainRoute" : input.entity === "train" ? "Train" : "Station", entityId: input.id, metadata: input.data as Prisma.InputJsonObject } });
      return updated;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ data: result });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireRole("ADMIN");
    const parsed = archiveCatalogSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid archive request." }, { status: 400 });
    const { entity, id } = parsed.data;
    const result = await prisma.$transaction(async (tx) => {
      const updated = entity === "station" ? await tx.station.update({ where: { id }, data: { isActive: false } }) : entity === "train" ? await tx.train.update({ where: { id }, data: { isActive: false } }) : await tx.trainRoute.update({ where: { id }, data: { isActive: false } });
      await tx.adminLog.create({ data: { adminId: admin.id, action: "ARCHIVE", entityType: entity === "route" ? "TrainRoute" : entity === "train" ? "Train" : "Station", entityId: id } });
      return updated;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ data: result });
  } catch (error) { return errorResponse(error); }
}
