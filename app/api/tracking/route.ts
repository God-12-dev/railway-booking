import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { dateRangeInIndia } from "@/lib/search/schema";

export const runtime = "nodejs";
const querySchema = z.object({ trainNumber: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,12}$/), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ trainNumber: url.searchParams.get("trainNumber"), date: url.searchParams.get("date") ?? undefined });
  if (!parsed.success) return NextResponse.json({ error: "Enter a train number and optional sample journey date." }, { status: 400 });
  try {
    const train = await prisma.train.findFirst({ where: { number: parsed.data.trainNumber, isActive: true }, include: { routes: { where: { isActive: true }, include: { origin: true, destination: true, stops: { include: { station: true }, orderBy: { stopOrder: "asc" } } } }, tracking: { orderBy: { simulatedAt: "desc" }, take: 1 } } });
    if (!train || train.routes.length === 0 || !train.tracking[0]) return NextResponse.json({ error: "No sample tracking route was found for that train." }, { status: 404 });
    const schedule = await prisma.trainSchedule.findFirst({ where: { trainId: train.id, isActive: true, ...(parsed.data.date ? { departureAt: dateRangeInIndia(parsed.data.date) } : { departureAt: { gte: new Date() } }) }, orderBy: { departureAt: "asc" } });
    if (!schedule) return NextResponse.json({ error: "No seeded schedule is available for that date." }, { status: 404 });
    const route = train.routes.find((candidate) => candidate.id === schedule.routeId);
    if (!route) return NextResponse.json({ error: "The sample route is unavailable." }, { status: 404 });
    const now = new Date();
    const delayMinutes = train.tracking[0].delayMinutes;
    const adjustedDeparture = new Date(schedule.departureAt.getTime() + delayMinutes * 60_000);
    const estimatedArrival = new Date(schedule.arrivalAt.getTime() + delayMinutes * 60_000);
    const duration = schedule.arrivalAt.getTime() - schedule.departureAt.getTime();
    const progressPercent = now < adjustedDeparture ? 0 : now >= estimatedArrival ? 100 : Math.min(99, Math.max(0, Math.floor(((now.getTime() - adjustedDeparture.getTime()) / duration) * 100)));
    const currentIndex = progressPercent >= 100 ? route.stops.length - 1 : Math.min(route.stops.length - 1, Math.floor((progressPercent / 100) * Math.max(1, route.stops.length - 1)));
    const currentStop = route.stops[currentIndex];
    const stops = route.stops.map((stop, index) => ({
      code: stop.station.code, name: stop.station.name, latitude: stop.station.latitude, longitude: stop.station.longitude,
      arrival: stop.arrivalTime, departure: stop.departureTime,
      state: index < currentIndex ? "PREVIOUS" : index === currentIndex ? "CURRENT" : "UPCOMING",
    }));
    return NextResponse.json({
      simulated: true, trainNumber: train.number, trainName: train.name, scheduleId: schedule.id,
      journeyDate: schedule.departureAt.toISOString(), currentStation: currentStop?.station.name ?? route.origin.name,
      currentStationCode: currentStop?.station.code ?? route.origin.code,
      previousStations: stops.filter((stop) => stop.state === "PREVIOUS"), upcomingStations: stops.filter((stop) => stop.state === "UPCOMING"),
      progressPercent, delayMinutes, scheduledArrival: schedule.arrivalAt.toISOString(), estimatedArrival: estimatedArrival.toISOString(),
      route: stops, simulatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Sample tracking request failed", error);
    return NextResponse.json({ error: "Sample tracking is unavailable. Check that PostgreSQL is running and the RailConnect sample data has been seeded." }, { status: 503 });
  }
}
