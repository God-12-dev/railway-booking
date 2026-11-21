import { NextResponse } from "next/server";
import { BookingStatus, FoodOrderStatus } from "@/app/generated/prisma/client";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const orderSchema = z.object({ bookingId: z.cuid().optional(), items: z.array(z.object({ foodItemId: z.cuid(), quantity: z.coerce.number().int().min(1).max(10) }).strict()).min(1).max(30) }).strict().refine((value) => new Set(value.items.map((item) => item.foodItemId)).size === value.items.length, "Choose each menu item once and adjust its quantity.");

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to place a simulated food order." }, { status: 401 });
  const parsed = orderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose valid menu items and quantities." }, { status: 400 });
  try {
    const order = await prisma.$transaction(async (tx) => {
      const itemIds = parsed.data.items.map((item) => item.foodItemId);
      const foods = await tx.foodItem.findMany({ where: { id: { in: itemIds }, available: true } });
      if (foods.length !== itemIds.length) throw new Error("MENU_CHANGED");
      if (parsed.data.bookingId) {
        const booking = await tx.booking.findFirst({ where: { id: parsed.data.bookingId, userId: user.id, status: BookingStatus.CONFIRMED, journeyDate: { gt: new Date() } }, select: { id: true } });
        if (!booking) throw new Error("BOOKING_INVALID");
      }
      const foodById = new Map(foods.map((food) => [food.id, food]));
      const total = parsed.data.items.reduce((sum, item) => sum + Number(foodById.get(item.foodItemId)!.price) * item.quantity, 0);
      const row = await tx.foodOrder.create({ data: { userId: user.id, bookingId: parsed.data.bookingId, status: FoodOrderStatus.PLACED, total, simulated: true, items: { create: parsed.data.items.map((item) => ({ foodItemId: item.foodItemId, quantity: item.quantity, unitPrice: foodById.get(item.foodItemId)!.price })) } }, select: { id: true, total: true, status: true } });
      await tx.notification.create({ data: { userId: user.id, title: "Sample food order placed", body: `Order ${row.id.slice(-8)} was added to your demo account.` } });
      return row;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ order: { id: order.id, total: Number(order.total), status: order.status } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "MENU_CHANGED") return NextResponse.json({ error: "A selected item is no longer available. Refresh the menu." }, { status: 409 });
    if (error instanceof Error && error.message === "BOOKING_INVALID") return NextResponse.json({ error: "Link this order to one of your upcoming confirmed sample bookings." }, { status: 400 });
    console.error("Food order creation failed", error);
    return NextResponse.json({ error: "The simulated food order could not be placed." }, { status: 500 });
  }
}
