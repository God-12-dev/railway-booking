import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { AuditLogTable, type AuditLogEntry } from "@/components/admin/audit-log";

export const dynamic = "force-dynamic";
export default async function AdminLogsPage() {
  const user = await getSessionUser(); if (!user || user.role !== "ADMIN") redirect("/login");
  const logs = await prisma.adminLog.findMany({ include: { admin: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 500 });
  return <AuditLogTable logs={logs as AuditLogEntry[]} />;
}
