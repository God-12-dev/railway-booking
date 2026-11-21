import { TravelClass, TrainType } from "@/app/generated/prisma/client";
import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Choose a valid journey date.");
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional();

export const trainSearchSchema = z.object({
  from: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,8}$/),
  to: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,8}$/),
  date: dateSchema,
  travelClass: z.enum(TravelClass).default(TravelClass.SL),
  passengers: z.coerce.number().int().min(1).max(6).default(1),
  sort: z.enum(["departure", "fare", "duration"]).default("departure"),
  trainType: z.enum(TrainType).optional(),
  maxFare: z.coerce.number().positive().optional(),
  maxDurationHours: z.coerce.number().positive().max(72).optional(),
  departAfter: timeSchema,
  departBefore: timeSchema,
  arriveAfter: timeSchema,
  arriveBefore: timeSchema,
});

export type TrainSearchInput = z.infer<typeof trainSearchSchema>;

export function dateRangeInIndia(date: string) {
  const start = new Date(`${date}T00:00:00+05:30`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { gte: start, lt: end };
}
