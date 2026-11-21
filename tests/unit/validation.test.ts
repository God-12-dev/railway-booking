import { describe, expect, it } from "vitest";
import { registerSchema } from "@/lib/auth/schemas";
import { stationSchema } from "@/lib/admin/schemas";
import { dateRangeInIndia } from "@/lib/search/schema";
import { parseTrainSearch } from "@/lib/search/trains";

describe("input validation", () => {
  it("normalizes registration email and requires a long password", () => {
    expect(registerSchema.parse({ name: "Ravi Kumar", email: "Ravi@Example.test", password: "a-very-long-secret" }).email).toBe("ravi@example.test");
    expect(registerSchema.safeParse({ name: "Ravi Kumar", email: "ravi@example.test", password: "short" }).success).toBe(false);
  });

  it("validates and normalizes station codes", () => {
    expect(stationSchema.parse({ code: "mys", name: "Mysuru Junction", city: "Mysuru", state: "Karnataka" }).code).toBe("MYS");
    expect(stationSchema.safeParse({ code: "bad code", name: "A", city: "B", state: "C" }).success).toBe(false);
  });

  it("accepts matching train search input and rejects same-station routes", () => {
    expect(parseTrainSearch({ from: "SBC", to: "MYS", date: "2026-11-28", passengers: "2", class: "SL" }).success).toBe(true);
    expect(parseTrainSearch({ from: "SBC", to: "SBC", date: "2026-11-28" })).toMatchObject({ success: false });
    expect(parseTrainSearch({ from: "SBC", to: "MYS", date: "tomorrow" })).toMatchObject({ success: false });
  });

  it("uses India local-day boundaries for timetable search", () => {
    const { gte, lt } = dateRangeInIndia("2026-11-28");
    expect(lt.getTime() - gte.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(gte.toISOString()).toBe("2026-11-27T18:30:00.000Z");
  });
});
