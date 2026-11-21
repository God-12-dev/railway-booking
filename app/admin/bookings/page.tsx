import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { BookingManager, type AdminBooking } from "@/components/admin/bookings";

export const dynamic = "force-dynamic";
export default async function AdminBookingsPage() {
  const user = await getSessionUser(); if (!user || user.role !== "ADMIN") redirect("/login");
  const bookings = await prisma.booking.findMany({ include: { user: { select: { name: true, email: true } }, schedule: { include: { train: true, route: { include: { origin: true, destination: true } } } }, passengers: true, seats: { include: { seat: { include: { coach: true } } } }, cancellation: true }, orderBy: { createdAt: "desc" }, take: 500 });
  return <BookingManager initial={bookings as AdminBooking[]} />;
}
