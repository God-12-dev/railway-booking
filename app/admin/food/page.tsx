import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { FoodManager, type FoodAdminData } from "@/components/admin/food";

export const dynamic = "force-dynamic";
export default async function AdminFoodPage() {
  const user = await getSessionUser(); if (!user || user.role !== "ADMIN") redirect("/login");
  const [items, orders] = await Promise.all([
    prisma.foodItem.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.foodOrder.findMany({ include: { user: { select: { name: true, email: true } }, booking: { select: { pnr: true } }, items: { include: { foodItem: true } } }, orderBy: { createdAt: "desc" }, take: 250 }),
  ]);
  return <FoodManager initial={{ items: items.map((item) => ({ ...item, price: Number(item.price) })), orders: orders.map((order) => ({ ...order, total: Number(order.total), items: order.items.map((item) => ({ ...item, unitPrice: Number(item.unitPrice) })) })) } as FoodAdminData} />;
}
