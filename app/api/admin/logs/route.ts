import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export async function GET() {
  try {
    await requireRole("ADMIN");
    const logs = await prisma.adminLog.findMany({ include: { admin: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 500 });
    return NextResponse.json({ logs });
  } catch (error) { if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 }); console.error(error); return NextResponse.json({ error: "Audit log unavailable." }, { status: 500 }); }
}
