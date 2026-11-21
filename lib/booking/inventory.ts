import { BookingStatus, SeatHoldStatus, TravelClass } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type SeatMapItem = { id: string; coachId: string; coachCode: string; number: string; berth: string; row: number; column: number; status: "AVAILABLE" | "BOOKED" | "HELD" | "MINE" };

export async function getSeatMap(scheduleId: string, travelClass: TravelClass, userId: string) {
  const schedule = await prisma.trainSchedule.findFirst({
    where: { id: scheduleId, isActive: true, train: { isActive: true }, route: { isActive: true } },
    include: {
      train: {
        include: {
          coaches: {
            where: { class: travelClass, isActive: true },
            include: {
              seats: {
                where: { isActive: true },
                orderBy: [{ row: "asc" }, { column: "asc" }],
                include: {
                  bookingSeats: { where: { scheduleId, active: true, booking: { status: BookingStatus.CONFIRMED } }, select: { id: true } },
                  holds: { where: { scheduleId, status: SeatHoldStatus.ACTIVE, expiresAt: { gt: new Date() } }, select: { id: true, userId: true } },
                },
              },
            },
          },
        },
      },
      route: { include: { origin: true, destination: true, fares: { where: { class: travelClass } } } },
    },
  });
  if (!schedule) return null;
  const coaches = schedule.train.coaches.map((coach) => ({
    id: coach.id,
    code: coach.code,
    seats: coach.seats.map((seat): SeatMapItem => {
      const mine = seat.holds.some((hold) => hold.userId === userId);
      const held = seat.holds.length > 0;
      return { id: seat.id, coachId: coach.id, coachCode: coach.code, number: seat.number, berth: seat.berth, row: seat.row, column: seat.column, status: seat.bookingSeats.length ? "BOOKED" : mine ? "MINE" : held ? "HELD" : "AVAILABLE" };
    }),
  }));
  return {
    scheduleId: schedule.id,
    trainNumber: schedule.train.number,
    trainName: schedule.train.name,
    travelClass,
    departureAt: schedule.departureAt.toISOString(),
    arrivalAt: schedule.arrivalAt.toISOString(),
    originCode: schedule.route.origin.code,
    originName: schedule.route.origin.name,
    destinationCode: schedule.route.destination.code,
    destinationName: schedule.route.destination.name,
    fare: Number(schedule.route.fares[0]?.amount ?? 0),
    coaches,
  };
}
