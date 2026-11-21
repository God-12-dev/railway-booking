import { UtensilsCrossed } from "lucide-react";
import { FoodMenu } from "@/components/food/food-menu";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export default async function FoodPage() {
  const user = await getSessionUser();
  const [foods, bookings] = await Promise.all([
    prisma.foodItem.findMany({ where: { available: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    user ? prisma.booking.findMany({ where: { userId: user.id, status: "CONFIRMED", journeyDate: { gt: new Date() } }, include: { schedule: { include: { train: true } } }, orderBy: { journeyDate: "asc" }, take: 12 }) : [],
  ]);
  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="mb-7 flex items-start gap-3"><span className="grid size-11 place-items-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"><UtensilsCrossed size={20} /></span><div><p className="text-xs font-bold uppercase tracking-[.17em] text-orange-600">Journey menu · sample</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Food for the ride</h1><p className="mt-2 text-sm text-slate-500">Add sample menu items to a mock order. Prices and fulfillment are for demonstration only.</p></div></div><FoodMenu items={foods.map((food) => ({ ...food, price: Number(food.price) }))} bookings={bookings.map((booking) => ({ id: booking.id, pnr: booking.pnr, trainName: booking.schedule.train.name, journeyDate: booking.journeyDate.toISOString(), originCode: booking.originCode, destinationCode: booking.destinationCode }))} signedIn={Boolean(user)} /></main>;
}
