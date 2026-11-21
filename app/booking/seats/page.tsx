import { redirect } from "next/navigation";
import { TravelClass } from "@/app/generated/prisma/client";
import { Card } from "@/components/ui/card";
import { SeatPicker } from "@/components/booking/seat-picker";
import { getSessionUser } from "@/lib/auth/session";
import { getSeatMap } from "@/lib/booking/inventory";

export const dynamic = "force-dynamic";
type Search = Promise<{ scheduleId?: string; class?: string; passengers?: string }>;

export default async function SeatSelectionPage({ searchParams }: { searchParams: Search }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const query = await searchParams;
  const travelClass = Object.values(TravelClass).includes(query.class as TravelClass) ? query.class as TravelClass : TravelClass.SL;
  const passengerCount = Math.min(6, Math.max(1, Number(query.passengers) || 1));
  if (!query.scheduleId) return <Message>Choose a train before selecting seats.</Message>;
  const map = await getSeatMap(query.scheduleId, travelClass, user.id).catch(() => null);
  if (!map) return <Message>This sample schedule is unavailable. Search again to choose another train.</Message>;
  return <SeatPicker map={map} passengerCount={passengerCount} />;
}

function Message({ children }: { children: React.ReactNode }) { return <main className="mx-auto max-w-4xl px-4 py-14"><Card className="p-8 text-center text-slate-600 dark:text-slate-300">{children}</Card></main>; }
