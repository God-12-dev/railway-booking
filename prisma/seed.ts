import "dotenv/config";
import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, TrainType, TravelClass, SeatBerth } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const stationData = [
    { code: "SBC", name: "KSR Bengaluru City", city: "Bengaluru", state: "Karnataka", latitude: 12.9784, longitude: 77.5699 },
    { code: "MYS", name: "Mysuru Junction", city: "Mysuru", state: "Karnataka", latitude: 12.3052, longitude: 76.6552 },
    { code: "MAS", name: "Chennai Central", city: "Chennai", state: "Tamil Nadu", latitude: 13.0827, longitude: 80.2707 },
    { code: "UBL", name: "Hubballi Junction", city: "Hubballi", state: "Karnataka", latitude: 15.3647, longitude: 75.124 },
    { code: "KGI", name: "Kengeri", city: "Bengaluru", state: "Karnataka", latitude: 12.9177, longitude: 77.4838 },
    { code: "MYA", name: "Mandya", city: "Mandya", state: "Karnataka", latitude: 12.5218, longitude: 76.8951 },
    { code: "JTJ", name: "Jolarpettai Junction", city: "Jolarpettai", state: "Tamil Nadu", latitude: 12.5681, longitude: 78.575 },
    { code: "KPD", name: "Katpadi Junction", city: "Vellore", state: "Tamil Nadu", latitude: 12.9692, longitude: 79.1345 },
    { code: "AJJ", name: "Arakkonam Junction", city: "Arakkonam", state: "Tamil Nadu", latitude: 13.0845, longitude: 79.6707 },
    { code: "TK", name: "Tumakuru", city: "Tumakuru", state: "Karnataka", latitude: 13.3379, longitude: 77.1022 },
    { code: "DVG", name: "Davangere", city: "Davangere", state: "Karnataka", latitude: 14.4663, longitude: 75.9238 },
    { code: "HVR", name: "Haveri", city: "Haveri", state: "Karnataka", latitude: 14.7951, longitude: 75.3991 },
  ];
  for (const station of stationData) await prisma.station.upsert({ where: { code: station.code }, update: station, create: station });

  const trainData = [
    { number: "RC12001", name: "Mysuru City Demo Express", type: TrainType.DEMO, origin: "SBC", destination: "MYS", distanceKm: 139, dep: "06:30", arr: "09:00", fare: 180, stops: [["SBC", "06:20", "06:30"], ["KGI", "07:10", "07:12"], ["MYA", "08:20", "08:22"], ["MYS", "09:00", "09:00"]] },
    { number: "RC12002", name: "Southern Connector Demo", type: TrainType.DEMO, origin: "SBC", destination: "MAS", distanceKm: 362, dep: "07:15", arr: "14:10", fare: 420, stops: [["SBC", "07:05", "07:15"], ["JTJ", "10:00", "10:05"], ["KPD", "11:20", "11:25"], ["AJJ", "12:15", "12:20"], ["MAS", "14:10", "14:10"]] },
    { number: "RC12003", name: "Deccan Route Demo", type: TrainType.DEMO, origin: "SBC", destination: "UBL", distanceKm: 469, dep: "20:00", arr: "06:30", fare: 540, stops: [["SBC", "19:50", "20:00"], ["TK", "22:00", "22:05"], ["DVG", "01:00", "01:05"], ["HVR", "03:30", "03:35"], ["UBL", "06:30", "06:30"]] },
  ];
  for (const item of trainData) {
    const train = await prisma.train.upsert({ where: { number: item.number }, update: { name: item.name, type: item.type }, create: { number: item.number, name: item.name, type: item.type } });
    const origin = await prisma.station.findUniqueOrThrow({ where: { code: item.origin } });
    const destination = await prisma.station.findUniqueOrThrow({ where: { code: item.destination } });
    const route = await prisma.trainRoute.upsert({
      where: { trainId_originStationId_destinationStationId: { trainId: train.id, originStationId: origin.id, destinationStationId: destination.id } },
      update: { distanceKm: item.distanceKm }, create: { trainId: train.id, originStationId: origin.id, destinationStationId: destination.id, distanceKm: item.distanceKm },
    });
    for (const [stopOrder, [code, arrivalTime, departureTime]] of item.stops.entries()) {
      const station = await prisma.station.findUniqueOrThrow({ where: { code } });
      await prisma.trainStop.upsert({ where: { routeId_stopOrder: { routeId: route.id, stopOrder } }, update: { stationId: station.id, arrivalTime, departureTime }, create: { routeId: route.id, stationId: station.id, stopOrder, arrivalTime, departureTime } });
    }
    for (const travelClass of [TravelClass.SL, TravelClass.THREE_AC, TravelClass.TWO_AC]) {
      const multiplier = travelClass === TravelClass.SL ? 1 : travelClass === TravelClass.THREE_AC ? 2.1 : 3.2;
      await prisma.trainFare.upsert({
        where: { routeId_class: { routeId: route.id, class: travelClass } },
        update: { amount: item.fare * multiplier }, create: { routeId: route.id, class: travelClass, amount: item.fare * multiplier },
      });
    }
    const [hour, minute] = item.dep.split(":").map(Number);
    const [arrivalHour, arrivalMinute] = item.arr.split(":").map(Number);
    const today = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()));
    for (let daysAhead = 1; daysAhead <= 30; daysAhead++) {
      const journeyDay = new Date(today);
      journeyDay.setUTCDate(journeyDay.getUTCDate() + daysAhead);
      const day = journeyDay.toISOString().slice(0, 10);
      const departure = new Date(`${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`);
      const nextDay = new Date(journeyDay);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      const arrivalDay = arrivalHour * 60 + arrivalMinute <= hour * 60 + minute ? nextDay.toISOString().slice(0, 10) : day;
      const arrival = new Date(`${arrivalDay}T${String(arrivalHour).padStart(2, "0")}:${String(arrivalMinute).padStart(2, "0")}:00+05:30`);
      await prisma.trainSchedule.upsert({
        where: { trainId_departureAt: { trainId: train.id, departureAt: departure } },
        update: { routeId: route.id, arrivalAt: arrival },
        create: { trainId: train.id, routeId: route.id, departureAt: departure, arrivalAt: arrival, operatingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] },
      });
    }
    const coachClasses = [
      { code: "S1", travelClass: TravelClass.SL, count: 24 },
      { code: "B1", travelClass: TravelClass.THREE_AC, count: 18 },
      { code: "A1", travelClass: TravelClass.TWO_AC, count: 12 },
    ];
    for (const coachData of coachClasses) {
      const coach = await prisma.coach.upsert({ where: { trainId_code: { trainId: train.id, code: coachData.code } }, update: { class: coachData.travelClass }, create: { trainId: train.id, code: coachData.code, class: coachData.travelClass } });
      for (let seatNo = 1; seatNo <= coachData.count; seatNo++) {
        const berth = [SeatBerth.LOWER, SeatBerth.MIDDLE, SeatBerth.UPPER][(seatNo - 1) % 3];
        await prisma.seat.upsert({ where: { coachId_number: { coachId: coach.id, number: String(seatNo) } }, update: {}, create: { coachId: coach.id, number: String(seatNo), berth, row: Math.ceil(seatNo / 6), column: (seatNo - 1) % 6 } });
      }
    }
    if (!(await prisma.trainTracking.findFirst({ where: { trainId: train.id } }))) {
      await prisma.trainTracking.create({ data: { trainId: train.id, currentStationCode: item.origin, previousStations: [], upcomingStations: item.stops.slice(1).map(([code]) => code), progressPercent: 0 } });
    }
    console.info(`Seeded ${train.number}, its 30-day sample timetable, and class coaches`);
  }

  const menu = [
    { name: "Masala Dosa", description: "Crisp rice crepe with potato masala", category: "Breakfast", price: 95, vegetarian: true },
    { name: "Veg Biryani", description: "Fragrant rice with seasonal vegetables", category: "Meals", price: 160, vegetarian: true },
    { name: "Chicken Biryani", description: "Spiced rice with chicken", category: "Meals", price: 220, vegetarian: false },
  ];
  for (const item of menu) await prisma.foodItem.upsert({ where: { name: item.name }, update: {}, create: item });

  if (process.env.RAILCONNECT_ADMIN_EMAIL && process.env.RAILCONNECT_ADMIN_PASSWORD) {
    const email = process.env.RAILCONNECT_ADMIN_EMAIL.toLowerCase();
    const passwordHash = await argon2.hash(process.env.RAILCONNECT_ADMIN_PASSWORD, { type: argon2.argon2id });
    await prisma.user.upsert({ where: { email }, update: { role: "ADMIN" }, create: { name: "RailConnect Administrator", email, passwordHash, role: "ADMIN" } });
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
