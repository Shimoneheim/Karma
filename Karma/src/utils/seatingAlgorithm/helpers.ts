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
