export type FareQuote = { unitFare: number; passengerCount: number; baseFare: number; convenienceFee: number; totalFare: number };

export function calculateFare(unitFare: number, passengerCount: number): FareQuote {
  if (!Number.isFinite(unitFare) || unitFare <= 0) throw new RangeError("Fare must be a positive finite amount.");
  if (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 6) throw new RangeError("Passenger count must be from one to six.");
  const unitCents = Math.round(unitFare * 100);
  const baseCents = unitCents * passengerCount;
  const convenienceCents = 2000 * passengerCount;
  return { unitFare: unitCents / 100, passengerCount, baseFare: baseCents / 100, convenienceFee: convenienceCents / 100, totalFare: (baseCents + convenienceCents) / 100 };
}

export function calculateSimulatedRefund(totalFare: number, hoursUntilDeparture: number) {
  if (!Number.isFinite(totalFare) || totalFare < 0 || !Number.isFinite(hoursUntilDeparture) || hoursUntilDeparture <= 0) throw new RangeError("Refund requires a positive fare and an upcoming journey.");
  const rate = hoursUntilDeparture >= 48 ? 0.9 : 0.75;
  return Math.round(totalFare * rate * 100) / 100;
}
