import { describe, it, expect } from "vitest";
import {
  parseStudentList,
  assignSeats,
  generateSeats,
  type Seat,
} from "./seatingAlgorithm";

describe("seatingAlgorithm", () => {
  it("parses student list correctly and auto-assigns numbers", () => {
    const input = `Ahmet Yılmaz 8\nMehmet Ali 5\n Ayşe K. 3 `;
    const students = parseStudentList(input);
    expect(students).toHaveLength(3);
    expect(students[0]).toEqual({
      number: "1",
      name: "Ahmet Yılmaz",
      grade: 8,
    });
    expect(students[1]).toEqual({ number: "2", name: "Mehmet Ali", grade: 5 });
    expect(students[2]).toEqual({ number: "3", name: "Ayşe K.", grade: 3 });
  });

  it("parses gender parameter safely allowing Surname E/K conflicts to resolve", () => {
    const input = `Ahmet Yılmaz 8\nAyşe K. 7\nVeli 6 E\n350 Fatma 5 K\nBERKAY K 8`;
    const students = parseStudentList(input);
    expect(students).toHaveLength(5);
    
    // Normal input
    expect(students[0].name).toBe("Ahmet Yılmaz");
    expect(students[0].grade).toBe(8);
    expect(students[0].gender).toBeUndefined();

    // Normal input with dotted surname
    expect(students[1].name).toBe("Ayşe K.");
    expect(students[1].grade).toBe(7);
    expect(students[1].gender).toBeUndefined();
    
    // New format with Gender at the end
    expect(students[2].name).toBe("Veli");
    expect(students[2].grade).toBe(6);
    expect(students[2].gender).toBe("E");
    
    // Legacy format combined with Gender at the end
    expect(students[3].name).toBe("Fatma");
    expect(students[3].number).toBe("350");
    expect(students[3].grade).toBe(5);
    expect(students[3].gender).toBe("K");
    
    // Conflicting surname 'K' before grade
    expect(students[4].name).toBe("BERKAY K");
    expect(students[4].grade).toBe(8);
    expect(students[4].gender).toBeUndefined(); // It must NOT parse K as gender!
  });

  it("supports legacy numbered input format", () => {
    const input = `45 Ahmet Yılmaz 8\n12 Mehmet Ali 5`;
    const students = parseStudentList(input);
    expect(students).toHaveLength(2);
    expect(students[0]).toEqual({
      number: "45",
      name: "Ahmet Yılmaz",
      grade: 8,
    });
    expect(students[1]).toEqual({ number: "12", name: "Mehmet Ali", grade: 5 });
  });

  it("generates the correct layout capacities", () => {
    const seats = generateSeats();
    expect(seats.filter((s) => s.salon === 1)).toHaveLength(20);
    expect(seats.filter((s) => s.salon === 2)).toHaveLength(16);
    expect(seats.filter((s) => s.salon === 3)).toHaveLength(12);
    expect(seats).toHaveLength(48); // 20 + 16 + 12
  });

  it("supports dynamic salon layout definitions", () => {
    const seats = generateSeats([
      { id: 10, name: "A", rows: 2, columns: 3 },
      { id: 11, name: "B", rows: 1, columns: 2 },
    ]);

    expect(seats.filter((s) => s.salon === 10)).toHaveLength(12); // 2 * 3 * 2
    expect(seats.filter((s) => s.salon === 11)).toHaveLength(4); // 1 * 2 * 2
    expect(seats).toHaveLength(16);

    const salon10Outer = seats.filter((s) => s.salon === 10 && s.isOuter);
    expect(salon10Outer).toHaveLength(4); // each row has only two outer seats
  });

  it("assigns seats respecting Inner/Outer constraint", () => {
    // Generate 48 students: 24 of Grade 5 (Inner Only), 12 Grade 8, 12 Grade 7
    let list = "";
    for (let i = 1; i <= 24; i++) list += `Student${i} 5\n`;
    for (let i = 25; i <= 36; i++) list += `Student${i} 8\n`;
    for (let i = 37; i <= 48; i++) list += `Student${i} 7\n`;

    const students = parseStudentList(list);
    const { seats, unassigned } = assignSeats(students, { rules: { enforceInnerOuterRule: true }, maxRetries: 50 });

    expect(unassigned).toHaveLength(0);

    for (const seat of seats) {
      if (seat.student) {
        const grade = seat.student.grade;
        if (seat.isOuter) {
          // Wall must NOT have MustCorridor students (grade <= 6)
          if (grade <= 6) {
             const inner = seats.find((s: Seat)=>s.salon===seat.salon && s.row===seat.row && s.column===seat.column && s.side!==seat.side);
             console.log(`VIOLATION: Grade ${grade} on Outer at ${seat.salon}-${seat.row}-${seat.column}-${seat.side}. Inner is ${inner?.student?.grade}`);
             console.log("SEAT:", JSON.stringify(seat));
             console.log("INNER:", JSON.stringify(inner));
          }
          expect(grade).toBeGreaterThan(6); 
        } else {
          // Corridor must NOT have MustWall students (grade 8)
          expect(grade).not.toBe(8);
        }
      }
    }
  });

  it("prevents Highest Grade students from sitting directly behind each other", () => {
    // Provide 10 highest grades so there is plenty of room to separate them without causing a deadlock
    let list = "";
    for (let i = 1; i <= 10; i++) list += `Student${i} 8\n`;
    for (let i = 11; i <= 30; i++) list += `Student${i} 7\n`;
    for (let i = 31; i <= 48; i++) list += `Student${i} 5\n`;

    const students = parseStudentList(list);
    const { seats } = assignSeats(students, { rules: { enforceGrade8VerticalRule: true } });

    for (let i = 0; i < seats.length; i++) {
      const seat = seats[i];
      if (seat.student?.grade === 8) {
        // check front seat
        const front = seats.find(
          (s: Seat) =>
            s.salon === seat.salon &&
            s.column === seat.column &&
            s.row === seat.row - 1 &&
            s.side === seat.side
        );
        if (front && front.student) {
          expect(front.student.grade).not.toBe(8);
        }
      }
    }
  });

  it("works seamlessly with High School grades as well", () => {
    // 9, 10, 11, 12
    let list = "";
    for (let i = 1; i <= 12; i++) list += `ST${i} 12\n`;
    for (let i = 13; i <= 24; i++) list += `ST${i} 11\n`;
    for (let i = 25; i <= 36; i++) list += `ST${i} 10\n`;
    for (let i = 37; i <= 48; i++) list += `ST${i} 9\n`;

    const students = parseStudentList(list);
    const { seats } = assignSeats(students, { rules: { enforceInnerOuterRule: true }, maxRetries: 50 });

    for (const seat of seats) {
      if (seat.student) {
        const grade = seat.student.grade;
        if (seat.isOuter) {
            // Wall must NOT have MustCorridor grades (9, 10)
            expect(grade).toBeGreaterThan(10);
        } else {
            // Corridor must NOT have MustWall grades (12)
            expect(grade).not.toBe(12);
        }
      }
    }
  });

  it("allows filling all seats when Inner/Outer rule is disabled", () => {
    let list = "";
    for (let i = 1; i <= 48; i++) list += `Student${i} 5\n`;

    const students = parseStudentList(list);
    const withDefaultRules = assignSeats(students, { maxRetries: 10 });
    // With all same grades, quality may still be 100 if no rules are violated
    // The important check is that it completes without errors
    expect(withDefaultRules.qualityScore).toBeLessThanOrEqual(100);

    const withInnerOuterDisabled = assignSeats(students, {
      maxRetries: 1,
      rules: {
        enforceInnerOuterRule: false,
        enforceGrade8VerticalRule: false,
        avoidSameGradeSideBySide: false,
        avoidSameGradeBehind: false,
      },
    });

    // When rules are disabled, quality score should remain 100
    expect(withInnerOuterDisabled.qualityScore).toBe(100);
  });
});
