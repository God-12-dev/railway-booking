import { describe, expect, it } from "vitest";
import { calculateFare, calculateSimulatedRefund } from "@/lib/booking/pricing";
import { assignPassengerSeats } from "@/lib/booking/seat-assignment";

describe("server fare calculation", () => {
  it("calculates fare and per-passenger demo fees in cents", () => {
    expect(calculateFare(180.25, 2)).toEqual({ unitFare: 180.25, passengerCount: 2, baseFare: 360.5, convenienceFee: 40, totalFare: 400.5 });
  });

  it("rejects an invalid fare and an out-of-range passenger count", () => {
    expect(() => calculateFare(0, 1)).toThrow(RangeError);
    expect(() => calculateFare(100, 7)).toThrow(RangeError);
  });

  it("calculates explicitly simulated refunds based on time to departure", () => {
    expect(calculateSimulatedRefund(1000, 48)).toBe(900);
    expect(calculateSimulatedRefund(1000, 12)).toBe(750);
    expect(() => calculateSimulatedRefund(1000, 0)).toThrow(RangeError);
  });
});

describe("passenger seat assignment", () => {
  it("honors explicit berth preferences and assigns each held seat once", () => {
    expect(assignPassengerSeats(
      [{ passengerId: "p1", seatPreference: "UPPER" }, { passengerId: "p2" }],
      [{ seatId: "s1", berth: "LOWER" }, { seatId: "s2", berth: "UPPER" }],
    )).toEqual([{ passengerId: "p1", seatId: "s2" }, { passengerId: "p2", seatId: "s1" }]);
  });

  it("rejects a preference that is not present among held seats", () => {
    expect(() => assignPassengerSeats([{ passengerId: "p1", seatPreference: "SIDE_LOWER" }], [{ seatId: "s1", berth: "LOWER" }])).toThrow("No held seat matches SIDE_LOWER");
  });

  it("requires a one-to-one passenger and seat count", () => {
    expect(() => assignPassengerSeats([{ passengerId: "p1" }], [])).toThrow(RangeError);
  });
});
