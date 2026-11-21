import { TrainType, TravelClass } from "@/app/generated/prisma/client";
import { z } from "zod";

const stationCode = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,8}$/);
export const stationSchema = z.object({
  code: stationCode,
  name: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
}).strict();

export const trainSchema = z.object({
  number: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,12}$/),
  name: z.string().trim().min(2).max(140),
  type: z.enum(TrainType),
}).strict();

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const routeSchemaBase = z.object({
  trainId: z.cuid(),
  originStationId: z.cuid(),
  destinationStationId: z.cuid(),
  distanceKm: z.number().int().min(1).max(10000),
  stops: z.array(z.object({ stationId: z.cuid(), arrivalTime: time, departureTime: time }).strict()).min(2).max(40),
  fares: z.array(z.object({ class: z.enum(TravelClass), amount: z.number().positive().max(100000) }).strict()).min(1),
  schedule: z.object({
    departureAt: z.iso.datetime(),
    arrivalAt: z.iso.datetime(),
    operatingDays: z.array(z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"])).min(1),
  }).strict(),
}).strict();

export const createRouteSchema = routeSchemaBase.superRefine((route, context) => {
  if (route.originStationId === route.destinationStationId) context.addIssue({ code: "custom", path: ["destinationStationId"], message: "Origin and destination must differ." });
  if (route.stops[0]?.stationId !== route.originStationId) context.addIssue({ code: "custom", path: ["stops"], message: "The first stop must be the route origin." });
  if (route.stops.at(-1)?.stationId !== route.destinationStationId) context.addIssue({ code: "custom", path: ["stops"], message: "The last stop must be the route destination." });
  if (new Date(route.schedule.arrivalAt) <= new Date(route.schedule.departureAt)) context.addIssue({ code: "custom", path: ["schedule", "arrivalAt"], message: "Arrival must be after departure." });
  if (new Set(route.fares.map((fare) => fare.class)).size !== route.fares.length) context.addIssue({ code: "custom", path: ["fares"], message: "Each class can have one fare." });
});

export const patchCatalogSchema = z.discriminatedUnion("entity", [
  z.object({ entity: z.literal("station"), id: z.cuid(), data: stationSchema.partial().extend({ isActive: z.boolean().optional() }) }).strict(),
  z.object({ entity: z.literal("train"), id: z.cuid(), data: trainSchema.partial().extend({ isActive: z.boolean().optional() }) }).strict(),
  z.object({ entity: z.literal("route"), id: z.cuid(), data: z.object({ isActive: z.boolean() }).strict() }).strict(),
]);

export const createCatalogSchema = z.discriminatedUnion("entity", [
  z.object({ entity: z.literal("station"), data: stationSchema }).strict(),
  z.object({ entity: z.literal("train"), data: trainSchema }).strict(),
  z.object({ entity: z.literal("route"), data: createRouteSchema }).strict(),
]);

export const archiveCatalogSchema = z.object({ entity: z.enum(["station", "train", "route"]), id: z.cuid() }).strict();
