import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { cancelBooking } from "@/lib/booking/cancel-booking";

export const runtime = "nodejs";
const cancelSchema = z.object({ bookingId: z.cuid(), reason: z.string().trim().max(300).optional() }).strict();

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage this booking." }, { status: 401 });
  const parsed = cancelSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid cancellation request." }, { status: 400 });
  try { return NextResponse.json(await cancelBooking({ ...parsed.data, userId: user.id })); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "BOOKING_NOT_FOUND") return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (message === "NOT_CANCELLABLE") return NextResponse.json({ error: "Only confirmed journeys that have not departed can be cancelled." }, { status: 409 });
    console.error("Booking cancellation failed", error);
    return NextResponse.json({ error: "Cancellation could not be completed." }, { status: 500 });
  }
}
