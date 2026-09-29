import type { Seat, SalonLayout } from "./types";
import { defaultSalons } from "./constants";

export function generateSeats(layouts: SalonLayout[] = defaultSalons): Seat[] {
  const seats: Seat[] = [];
  for (const salon of layouts) {
    for (let c = 0; c < salon.columns; c++) {
      for (let r = 0; r < salon.rows; r++) {
        const leftIsOuter = c === 0;
        const rightIsOuter = c === salon.columns - 1;

        seats.push({
          salon: salon.id,
          column: c,
          row: r,
          side: "left",
          isOuter: leftIsOuter,
          student: null,
        });
        seats.push({
          salon: salon.id,
          column: c,
          row: r,
          side: "right",
          isOuter: rightIsOuter,
          student: null,
        });
      }
    }
  }
  return seats;
}

export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export type SeatIndex = Map<string, Seat>;

export function seatKey(salon: number, column: number, row: number, side: Seat["side"]): string {
  return `${salon}|${column}|${row}|${side}`;
}

/** O(1) seat lookup by position; replaces repeated linear `seats.find` scans. */
export function buildSeatIndex(seats: Seat[]): SeatIndex {
  const index: SeatIndex = new Map();
  for (const seat of seats) {
    index.set(seatKey(seat.salon, seat.column, seat.row, seat.side), seat);
  }
  return index;
}
