import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { InventoryManager, type InventoryData } from "@/components/admin/inventory";

export const dynamic = "force-dynamic";
export default async function InventoryPage() {
  const user = await getSessionUser(); if (!user || user.role !== "ADMIN") redirect("/login");
  const [trains, coaches] = await Promise.all([
    prisma.train.findMany({ where: { isActive: true }, select: { id: true, number: true, name: true }, orderBy: { number: "asc" } }).catch(() => []),
    prisma.coach.findMany({ include: { train: true, seats: { orderBy: [{ row: "asc" }, { column: "asc" }] } }, orderBy: [{ train: { number: "asc" } }, { code: "asc" }] }).catch(() => []),
  ]);
  return <InventoryManager initial={{ trains, coaches } as InventoryData} />;
}
