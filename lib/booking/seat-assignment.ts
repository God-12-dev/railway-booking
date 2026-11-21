export type PassengerSeatRequest = { passengerId: string; seatPreference?: string | null };
export type HeldSeat = { seatId: string; berth: string };
export type SeatAssignment = { passengerId: string; seatId: string };

export function assignPassengerSeats(passengers: PassengerSeatRequest[], heldSeats: HeldSeat[]): SeatAssignment[] {
  if (passengers.length === 0 || passengers.length !== heldSeats.length) throw new RangeError("Passenger and held-seat counts must match.");
  const available = [...heldSeats];
  return passengers.map((passenger) => {
    const preference = passenger.seatPreference;
    const seatIndex = preference ? available.findIndex((seat) => seat.berth === preference) : 0;
    if (seatIndex < 0) throw new RangeError(`No held seat matches ${preference}.`);
    const [seat] = available.splice(seatIndex, 1);
    if (!seat) throw new RangeError("No seat remains for this passenger.");
    return { passengerId: passenger.passengerId, seatId: seat.seatId };
  });
}
