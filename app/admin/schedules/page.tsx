import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ScheduleManager, type ScheduleData } from "@/components/admin/schedules";

export const dynamic = "force-dynamic";
export default async function SchedulesPage() {
  const user = await getSessionUser(); if (!user || user.role !== "ADMIN") redirect("/login");
  const [schedules, routes] = await Promise.all([
    prisma.trainSchedule.findMany({ include: { train: true, route: { include: { origin: true, destination: true } } }, orderBy: { departureAt: "desc" }, take: 250 }).catch(() => []),
    prisma.trainRoute.findMany({ where: { isActive: true, train: { isActive: true } }, include: { train: true, origin: true, destination: true }, orderBy: { train: { number: "asc" } } }).catch(() => []),
  ]);
  const initial: ScheduleData = { schedules: schedules as ScheduleData["schedules"], routes: routes as ScheduleData["routes"] };
  return <ScheduleManager initial={initial} />;
}
