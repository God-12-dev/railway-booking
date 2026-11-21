import { BookingStatus, SeatHoldStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { dateRangeInIndia, trainSearchSchema, type TrainSearchInput } from "@/lib/search/schema";

export type SearchResult = {
  trainId: string;
  trainNumber: string;
  trainName: string;
  trainType: string;
  scheduleId: string;
  departureAt: string;
  arrivalAt: string;
  durationMinutes: number;
  originCode: string;
  originName: string;
  destinationCode: string;
  destinationName: string;
  stops: { code: string; name: string; arrival: string; departure: string }[];
  fare: number;
  availableSeats: number;
  totalSeats: number;
};

function minutesOfDay(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}
function timeNumber(time?: string) { return time ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) : undefined; }
function checkWindow(value: number, after?: string, before?: string) {
  const start = timeNumber(after); const end = timeNumber(before);
  return (start === undefined || value >= start) && (end === undefined || value <= end);
}

export function parseTrainSearch(raw: Record<string, string | string[] | undefined>) {
  let from = typeof raw.from === "string" ? raw.from : undefined;
  let to = typeof raw.to === "string" ? raw.to : undefined;
  if ((!from || !to) && typeof raw.route === "string") [from, to] = raw.route.split("-");
  const value = {
    ...raw,
    from,
    to,
    travelClass: raw.class ?? raw.travelClass,
  };
  const parsed = trainSearchSchema.safeParse(value);
  if (!parsed.success) return { success: false as const, error: "Enter a valid route, journey date, and passenger count." };
  if (parsed.data.from === parsed.data.to) return { success: false as const, error: "Choose different origin and destination stations." };
  return { success: true as const, data: parsed.data };
}

export async function searchTrains(input: TrainSearchInput): Promise<SearchResult[]> {
  const now = new Date();
  const routes = await prisma.trainRoute.findMany({
    where: {
      isActive: true,
      origin: { code: input.from, isActive: true },
      destination: { code: input.to, isActive: true },
      train: { isActive: true, ...(input.trainType ? { type: input.trainType } : {}) },
      fares: { some: { class: input.travelClass } },
      schedules: { some: { isActive: true, departureAt: dateRangeInIndia(input.date) } },
    },
    include: {
      train: {
        include: {
          coaches: {
            where: { class: input.travelClass, isActive: true },
            include: { _count: { select: { seats: { where: { isActive: true } } } } },
          },
        },
      },
      origin: true,
      destination: true,
      stops: { include: { station: true }, orderBy: { stopOrder: "asc" } },
      fares: { where: { class: input.travelClass } },
      schedules: {
        where: { isActive: true, departureAt: dateRangeInIndia(input.date) },
        include: {
          bookingSeats: { where: { active: true, booking: { status: BookingStatus.CONFIRMED } }, select: { seatId: true } },
          seatHolds: { where: { status: SeatHoldStatus.ACTIVE, expiresAt: { gt: now } }, select: { seatId: true } },
        },
      },
    },
  });

  const results: SearchResult[] = [];
  for (const route of routes) {
    const fare = Number(route.fares[0]?.amount ?? 0);
    const totalSeats = route.train.coaches.reduce((sum, coach) => sum + coach._count.seats, 0);
    for (const schedule of route.schedules) {
      const booked = new Set(schedule.bookingSeats.map((seat) => seat.seatId));
      const held = new Set(schedule.seatHolds.map((seat) => seat.seatId));
      const unavailable = new Set([...booked, ...held]);
      const durationMinutes = Math.max(0, Math.round((schedule.arrivalAt.getTime() - schedule.departureAt.getTime()) / 60000));
      if (input.maxFare !== undefined && fare > input.maxFare) continue;
      if (input.maxDurationHours !== undefined && durationMinutes > input.maxDurationHours * 60) continue;
      if (!checkWindow(minutesOfDay(schedule.departureAt), input.departAfter, input.departBefore)) continue;
      if (!checkWindow(minutesOfDay(schedule.arrivalAt), input.arriveAfter, input.arriveBefore)) continue;
      results.push({
        trainId: route.train.id,
        trainNumber: route.train.number,
        trainName: route.train.name,
        trainType: route.train.type,
        scheduleId: schedule.id,
        departureAt: schedule.departureAt.toISOString(),
        arrivalAt: schedule.arrivalAt.toISOString(),
        durationMinutes,
        originCode: route.origin.code,
        originName: route.origin.name,
        destinationCode: route.destination.code,
        destinationName: route.destination.name,
        stops: route.stops.map((stop) => ({ code: stop.station.code, name: stop.station.name, arrival: stop.arrivalTime, departure: stop.departureTime })),
        fare,
        availableSeats: Math.max(0, totalSeats - unavailable.size),
        totalSeats,
      });
    }
  }
  if (input.sort === "fare") results.sort((a, b) => a.fare - b.fare || a.departureAt.localeCompare(b.departureAt));
  else if (input.sort === "duration") results.sort((a, b) => a.durationMinutes - b.durationMinutes || a.departureAt.localeCompare(b.departureAt));
  else results.sort((a, b) => a.departureAt.localeCompare(b.departureAt));
  return results;
}
