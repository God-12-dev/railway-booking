import { NextResponse } from "next/server";
import { UserRole } from "@/app/generated/prisma/client";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const patchSchema = z.object({ id: z.cuid(), data: z.object({ role: z.enum(UserRole).optional(), isActive: z.boolean().optional() }).strict().refine((data) => Object.keys(data).length > 0) }).strict();

export async function GET() {
  try {
    await requireRole("ADMIN");
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, _count: { select: { bookings: true } } }, orderBy: { createdAt: "desc" }, take: 500 });
    return NextResponse.json({ users });
  } catch (error) { if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 }); console.error(error); return NextResponse.json({ error: "User list unavailable." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireRole("ADMIN"); const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid user update." }, { status: 400 });
    if (parsed.data.id === admin.id && (parsed.data.data.isActive === false || parsed.data.data.role === "PASSENGER")) return NextResponse.json({ error: "You cannot remove your own administrator access." }, { status: 409 });
    const target = await prisma.user.findUnique({ where: { id: parsed.data.id }, select: { id: true, role: true, isActive: true } });
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
    const removesAdmin = target.role === "ADMIN" && target.isActive && (parsed.data.data.role === "PASSENGER" || parsed.data.data.isActive === false);
    if (removesAdmin && await prisma.user.count({ where: { role: "ADMIN", isActive: true } }) <= 1) return NextResponse.json({ error: "Keep at least one active administrator." }, { status: 409 });
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id: target.id }, data: parsed.data.data, select: { id: true, name: true, email: true, role: true, isActive: true } });
      await tx.adminLog.create({ data: { adminId: admin.id, action: "UPDATE", entityType: "User", entityId: user.id, metadata: parsed.data.data } });
      if (parsed.data.data.isActive === false) await tx.session.deleteMany({ where: { userId: user.id } });
      return user;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ user: updated });
  } catch (error) { if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 }); console.error(error); return NextResponse.json({ error: "User update failed." }, { status: 500 }); }
}
