"use client";

import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Stop = { code: string; name: string; latitude: number | null; longitude: number | null; state: string };
export function RouteMap({ stops }: { stops: Stop[] }) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const locatedStops = stops.filter((stop): stop is Stop & { latitude: number; longitude: number } => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude));
  const points = locatedStops.map((stop) => [stop.latitude, stop.longitude] as [number, number]);
  if (points.length === 0) return <div className="grid h-72 place-items-center rounded-2xl bg-slate-100 text-sm text-slate-500 dark:bg-slate-800">Route coordinates have not been added.</div>;
  const center: [number, number] = [points.reduce((sum, point) => sum + point[0], 0) / points.length, points.reduce((sum, point) => sum + point[1], 0) / points.length];
  return <div>
    <MapContainer center={center} zoom={6} scrollWheelZoom={false} className="h-72 w-full rounded-2xl sm:h-[380px]" aria-label="Map of the sample train route">
      <FitRoute points={points} />
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" eventHandlers={{ tileerror: () => setTilesFailed(true) }} />
      {points.length > 1 && <Polyline positions={points} pathOptions={{ color: "#ea7b2b", weight: 4, opacity: 0.9, dashArray: "7 8" }} />}
      {locatedStops.map((stop) => <CircleMarker key={stop.code} center={[stop.latitude, stop.longitude]} radius={stop.state === "CURRENT" ? 9 : 6} pathOptions={{ color: stop.state === "CURRENT" ? "#ea7b2b" : "#0b1834", fillColor: stop.state === "CURRENT" ? "#fb923c" : "#fff", fillOpacity: 1, weight: 3 }}><Tooltip>{stop.name} · {stop.code}{stop.state === "CURRENT" ? " · simulated current station" : ""}</Tooltip></CircleMarker>)}
    </MapContainer>
    {tilesFailed && <p role="status" className="mt-2 text-xs text-amber-700 dark:text-amber-300">Map tiles could not load. The sample route and stations are still shown; check your internet connection.</p>}
  </div>;
}

function FitRoute({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [28, 28], maxZoom: 9 });
    else if (points[0]) map.setView(points[0], 11);
  }, [map, points]);
  return null;
}
