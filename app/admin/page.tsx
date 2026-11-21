import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpenCheck, ClipboardList, Coins, CookingPot, MapPinned, TrainFront, Users } from "lucide-react";
import { BookingChart, type ChartMonth } from "@/components/admin/booking-chart";
import { Card } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const months = Array.from({ length: 6 }, (_, index) => { const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5 - index)); return { key: date.toISOString().slice(0, 7), label: new Intl.DateTimeFormat("en-IN", { month: "short" }).format(date) }; });

export default async function AdminDashboardPage() {
  const user = await getSessionUser(); if (!user || user.role !== "ADMIN") redirect("/login");
  const [users, trains, bookings, confirmed, cancelled, revenue, recentBookings, routes] = await Promise.all([
    prisma.user.count(), prisma.train.count({ where: { isActive: true } }), prisma.booking.count(),
    prisma.booking.count({ where: { status: "CONFIRMED" } }), prisma.booking.count({ where: { status: "CANCELLED" } }),
    prisma.payment.aggregate({ where: { status: "SUCCEEDED" }, _sum: { amount: true } }),
    prisma.booking.findMany({ where: { createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) } }, select: { createdAt: true, status: true, originCode: true, destinationCode: true }, take: 5000 }),
    prisma.booking.findMany({ select: { originCode: true, destinationCode: true }, take: 10000 }),
  ]);
  const monthly: ChartMonth[] = months.map(({ key, label }) => { const entries = recentBookings.filter((booking) => booking.createdAt.toISOString().slice(0, 7) === key); return { month: label, confirmed: entries.filter((entry) => entry.status === "CONFIRMED").length, cancelled: entries.filter((entry) => entry.status === "CANCELLED").length, pending: entries.filter((entry) => entry.status === "PENDING_PAYMENT").length }; });
  const routeCounts = new Map<string, number>(); for (const booking of routes) { const key = `${booking.originCode} → ${booking.destinationCode}`; routeCounts.set(key, (routeCounts.get(key) ?? 0) + 1); }
  const popular = [...routeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const links = [
    { href: "/admin/catalog", icon: <MapPinned size={17} />, title: "Stations & trains", detail: "Catalog and route setup" },
    { href: "/admin/schedules", icon: <TrainFront size={17} />, title: "Schedules", detail: "Timetable management" },
    { href: "/admin/inventory", icon: <BookOpenCheck size={17} />, title: "Coaches & seats", detail: "Class inventory" },
    { href: "/admin/bookings", icon: <ClipboardList size={17} />, title: "Bookings", detail: "Passengers and status" },
    { href: "/admin/users", icon: <Users size={17} />, title: "Users", detail: "Access and account state" },
    { href: "/admin/food", icon: <CookingPot size={17} />, title: "Food", detail: "Menu and mock orders" },
    { href: "/admin/logs", icon: <ClipboardList size={17} />, title: "Audit log", detail: "Administrator activity" },
  ];
  return <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div><p className="text-xs font-bold uppercase tracking-[.17em] text-orange-600">Administration · simulated platform</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Operations overview</h1><p className="mt-2 text-sm text-slate-500">System activity and sample transaction metrics.</p></div><div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"><Metric icon={<Users />} title="Users" value={users.toLocaleString("en-IN")} /><Metric icon={<TrainFront />} title="Active trains" value={trains.toLocaleString("en-IN")} /><Metric icon={<ClipboardList />} title="Bookings" value={bookings.toLocaleString("en-IN")} /><Metric icon={<BookOpenCheck />} title="Confirmed" value={confirmed.toLocaleString("en-IN")} /><Metric icon={<ClipboardList />} title="Cancelled" value={cancelled.toLocaleString("en-IN")} /><Metric icon={<Coins />} title="Simulated revenue" value={`₹${Number(revenue._sum.amount ?? 0).toLocaleString("en-IN")}`} /></div>
    <div className="mt-7 grid gap-5 xl:grid-cols-[1.35fr_.65fr]"><Card className="p-5 sm:p-6"><div><h2 className="font-semibold">Bookings over six months</h2><p className="mt-1 text-xs text-slate-400">Counts from stored demo bookings</p></div><div className="mt-5"><BookingChart data={monthly} /></div></Card><Card className="p-5 sm:p-6"><h2 className="font-semibold">Popular sample routes</h2><p className="mt-1 text-xs text-slate-400">Based on saved demo bookings</p><div className="mt-5 space-y-4">{popular.length ? popular.map(([route, count], index) => <div key={route} className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800">0{index + 1}</span><span className="flex-1 text-sm font-medium">{route}</span><span className="text-xs text-slate-400">{count}</span></div>) : <p className="py-6 text-center text-sm text-slate-500">No bookings have been recorded.</p>}</div></Card></div>
    <div className="mt-7"><h2 className="text-lg font-semibold">System management</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{links.map((item) => <Link key={item.href} href={item.href}><Card className="group flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lg"><span className="grid size-10 place-items-center rounded-xl bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300">{item.icon}</span><span className="flex-1"><span className="block text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs text-slate-500">{item.detail}</span></span><ArrowRight size={15} className="text-slate-400 transition group-hover:translate-x-1" /></Card></Link>)}</div></div><p className="mt-7 text-xs text-slate-400">All revenue, bookings, user activity, schedules, and fulfillment metrics are for the RailConnect demonstration.</p>
  </main>;
}

function Metric({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) { return <Card className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-slate-500">{title}</span><span className="text-orange-600">{icon}</span></div><p className="mt-4 truncate text-2xl font-semibold text-slate-950 dark:text-white">{value}</p></Card>; }
