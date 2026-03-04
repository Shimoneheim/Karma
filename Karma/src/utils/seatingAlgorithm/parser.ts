import type { Student } from "./types";

export function parseStudentList(input: string): Student[] {
  const lines = input.split("\n");
  const parsedRows: Array<{
    providedNumber: string | null;
    name: string;
    grade: number;
    gender?: "E" | "K";
  }> = [];
  let nextAutoNumber = 1;
  const usedNumbers = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Security Fix: Prevent ReDoS on extremely long lines
    if (trimmed.length > 300) continue;

    // Legacy support: [Numara] [Ad Soyad] [Sınıf] [Cinsiyet]?
    const withNumber = trimmed.match(/^(\d+)\s+(.+?)\s+(\d+)(?:\s+([EKek]))?$/);
    if (withNumber) {
      parsedRows.push({
        providedNumber: withNumber[1],
        name: withNumber[2].trim(),
        gender: withNumber[4] ? (withNumber[4].toUpperCase() as "E" | "K") : undefined,
        grade: parseInt(withNumber[3], 10),
      });
      continue;
    }

    // New format: [Ad Soyad] [Sınıf] [Cinsiyet]?
    const withoutNumber = trimmed.match(/^(.+?)\s+(\d+)(?:\s+([EKek]))?$/);
    if (withoutNumber) {
      parsedRows.push({
        providedNumber: null,
        name: withoutNumber[1].trim(),
        gender: withoutNumber[3] ? (withoutNumber[3].toUpperCase() as "E" | "K") : undefined,
        grade: parseInt(withoutNumber[2], 10),
      });
    }
  }

  return parsedRows.map((row) => {
    let number: string;
    if (row.providedNumber && !usedNumbers.has(row.providedNumber)) {
      number = row.providedNumber;
      usedNumbers.add(number);
    } else {
      while (usedNumbers.has(String(nextAutoNumber))) {
        nextAutoNumber += 1;
      }
      number = String(nextAutoNumber);
      usedNumbers.add(number);
      nextAutoNumber += 1;
    }

    return {
      number,
      name: row.name,
      grade: row.grade,
      gender: row.gender,
      isGhost: false,
    };
  });
}
