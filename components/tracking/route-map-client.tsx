"use client";

import dynamic from "next/dynamic";
type Stop = { code: string; name: string; latitude: number | null; longitude: number | null; state: string };
const Map = dynamic(() => import("@/components/tracking/route-map").then((module) => module.RouteMap), { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" /> });
export function RouteMapClient({ stops }: { stops: Stop[] }) { return <Map stops={stops} />; }
