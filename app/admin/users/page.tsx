import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { UserManager, type AdminUser } from "@/components/admin/users";

export const dynamic = "force-dynamic";
export default async function UsersPage() {
  const admin = await getSessionUser(); if (!admin || admin.role !== "ADMIN") redirect("/login");
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, _count: { select: { bookings: true } } }, orderBy: { createdAt: "desc" }, take: 500 });
  return <UserManager users={users as AdminUser[]} currentAdminId={admin.id} />;
}
