import { SeatBerth } from "@/app/generated/prisma/client";
import { z } from "zod";

export const passengerSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  age: z.coerce.number().int().min(1).max(120),
  gender: z.enum(["FEMALE", "MALE", "OTHER", "UNDISCLOSED"]),
  seatPreference: z.enum(SeatBerth).optional(),
}).strict();

export const draftBookingSchema = z.object({ scheduleId: z.cuid(), travelClass: z.string(), passengers: z.array(passengerSchema).min(1).max(6) }).strict();
export const simulatedPaymentSchema = z.object({ bookingId: z.cuid(), outcome: z.enum(["SUCCESS", "FAILURE"]) }).strict();
