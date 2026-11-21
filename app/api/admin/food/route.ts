import { NextResponse } from "next/server";
import { FoodOrderStatus, Prisma } from "@/app/generated/prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const itemData = z.object({ name: z.string().trim().min(2).max(120), description: z.string().trim().min(2).max(500), category: z.string().trim().min(2).max(60), price: z.number().positive().max(100000), vegetarian: z.boolean() }).strict();
const patchSchema = z.discriminatedUnion("entity", [z.object({ entity: z.literal("item"), id: z.cuid(), data: itemData.partial().extend({ available: z.boolean().optional() }) }).strict(), z.object({ entity: z.literal("order"), id: z.cuid(), status: z.enum(FoodOrderStatus) }).strict()]);
const itemCreateSchema = z.object({ entity: z.literal("item"), data: itemData }).strict();
const transitions: Record<FoodOrderStatus, FoodOrderStatus[]> = { PLACED: ["ACCEPTED", "CANCELLED"], ACCEPTED: ["PREPARING", "CANCELLED"], PREPARING: ["ON_THE_WAY", "CANCELLED"], ON_THE_WAY: ["DELIVERED"], DELIVERED: [], CANCELLED: [] };

function forbidden(error: unknown) { return error instanceof Error && error.message === "FORBIDDEN"; }
function duplicate(error: unknown) { return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"; }

export async function GET() {
  try { await requireRole("ADMIN"); const [items, orders] = await Promise.all([prisma.foodItem.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }), prisma.foodOrder.findMany({ include: { user: { select: { name: true, email: true } }, booking: { select: { pnr: true } }, items: { include: { foodItem: true } } }, orderBy: { createdAt: "desc" }, take: 250 })]); return NextResponse.json({ items, orders }); }
  catch (error) { if (forbidden(error)) return NextResponse.json({ error: "Administrator access required." }, { status: 403 }); console.error(error); return NextResponse.json({ error: "Food management data unavailable." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const admin = await requireRole("ADMIN"); const parsed = itemCreateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid menu item." }, { status: 400 });
    const item = await prisma.$transaction(async (tx) => { const created = await tx.foodItem.create({ data: parsed.data.data }); await tx.adminLog.create({ data: { adminId: admin.id, action: "CREATE", entityType: "FoodItem", entityId: created.id } }); return created; });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) { if (forbidden(error)) return NextResponse.json({ error: "Administrator access required." }, { status: 403 }); if (duplicate(error)) return NextResponse.json({ error: "A menu item with that name already exists." }, { status: 409 }); console.error(error); return NextResponse.json({ error: "Menu item could not be created." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireRole("ADMIN"); const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid food management update." }, { status: 400 });
    const result = await prisma.$transaction(async (tx) => {
      if (parsed.data.entity === "item") {
        const updated = await tx.foodItem.update({ where: { id: parsed.data.id }, data: parsed.data.data });
        await tx.adminLog.create({ data: { adminId: admin.id, action: "UPDATE", entityType: "FoodItem", entityId: updated.id } });
        return { item: updated };
      }
      const order = await tx.foodOrder.findUniqueOrThrow({ where: { id: parsed.data.id }, select: { status: true } });
      if (!transitions[order.status].includes(parsed.data.status)) throw new Error("ORDER_TRANSITION_INVALID");
      const updated = await tx.foodOrder.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
      await tx.adminLog.create({ data: { adminId: admin.id, action: "UPDATE_STATUS", entityType: "FoodOrder", entityId: updated.id, metadata: { status: updated.status } } });
      return { order: updated };
    });
    return NextResponse.json(result);
  } catch (error) { if (forbidden(error)) return NextResponse.json({ error: "Administrator access required." }, { status: 403 }); if (error instanceof Error && error.message === "ORDER_TRANSITION_INVALID") return NextResponse.json({ error: "That food order status transition is not allowed." }, { status: 409 }); console.error(error); return NextResponse.json({ error: "Food update failed." }, { status: 500 }); }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireRole("ADMIN"); const parsed = z.object({ id: z.cuid() }).safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid item archive request." }, { status: 400 });
    const item = await prisma.$transaction(async (tx) => { const updated = await tx.foodItem.update({ where: { id: parsed.data.id }, data: { available: false } }); await tx.adminLog.create({ data: { adminId: admin.id, action: "ARCHIVE", entityType: "FoodItem", entityId: updated.id } }); return updated; });
    return NextResponse.json({ item });
  } catch (error) { if (forbidden(error)) return NextResponse.json({ error: "Administrator access required." }, { status: 403 }); console.error(error); return NextResponse.json({ error: "Menu item could not be archived." }, { status: 500 }); }
}
