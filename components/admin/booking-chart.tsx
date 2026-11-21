"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
export type ChartMonth = { month: string; confirmed: number; cancelled: number; pending: number };

export function BookingChart({ data }: { data: ChartMonth[] }) {
  return <div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 5" vertical={false} /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} /><Tooltip cursor={{ fill: "#f8fafc" }} contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }} /><Legend /><Bar name="Confirmed" dataKey="confirmed" fill="#0b1834" radius={[5, 5, 0, 0]} /><Bar name="Cancelled" dataKey="cancelled" fill="#f7903d" radius={[5, 5, 0, 0]} /><Bar name="Pending" dataKey="pending" fill="#94a3b8" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>;
}
