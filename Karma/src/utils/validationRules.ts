import type { Seat, SalonLayout, AssignmentRules } from "./seatingAlgorithm";

export interface Violation {
  salonName: string;
  message: string;
  seatRef: Seat;
}

export function checkViolations(
  seats: Seat[],
  salons: SalonLayout[],
  rules: AssignmentRules
): Violation[] {
  const violations: Violation[] = [];
  
  // Find highest grade for dynamic rules
  let maxGrade = 8; // Default
  const allStudents = seats.map(s => s.student).filter(Boolean) as any[];
  if (allStudents.length > 0) {
    maxGrade = Math.max(...allStudents.map(s => s.grade));
  }
  const isHighSchool = maxGrade >= 9;
  const upperGrades = isHighSchool ? [11, 12] : [7, 8]; // Include 7 and 8 for middle school
  const highestGrade = isHighSchool ? 12 : 8;

  for (const seat of seats) {
    if (!seat.student) continue;

    const salonInfo = salons.find((s) => s.id === seat.salon);
    const sName = salonInfo?.name || `Salon ${seat.salon}`;

    // 1. Inner/Outer Rule (8/12 forced to Wall, Juniors forced to Corridor, 7/11 Flexible/Exempt)
    if (rules.enforceInnerOuterRule) {
      const isMustWall = isHighSchool ? (seat.student.grade === 12) : (seat.student.grade === 8);
      const isMustCorridor = isHighSchool ? (seat.student.grade <= 10) : (seat.student.grade <= 6);
      // Note: 11 and 7 are not in either category, they are flexible.

      if (!seat.isOuter && isMustWall) {
          // Senior (8/12) on Corridor = Violation
          violations.push({
            salonName: sName,
            message: `${seat.student.number} (${seat.student.grade}.Sınıf) mutlaka duvar tarafına oturmalı.`,
            seatRef: seat,
          });
      } else if (seat.isOuter && isMustCorridor) {
          // Junior (<7 or <11) on Wall = Violation ONLY IF neighbor is occupied
          const neighbor = seats.find(
            (s) =>
              s.salon === seat.salon &&
              s.column === seat.column &&
              s.row === seat.row &&
              s.side !== seat.side
          );
          
          if (neighbor?.student && neighbor.student.grade > seat.student.grade) {
            violations.push({
              salonName: sName,
              message: `${seat.student.number} (${seat.student.grade}.Sınıf) alt sınıf olduğu için koridor tarafına oturmalı.`,
              seatRef: seat,
            });
          }
      }
    }

    // 2. Highest Grade Vertical Separation (Grade 8 or 12 only)
    if (rules.enforceGrade8VerticalRule && (seat.student.grade === 8 || seat.student.grade === 12)) {
      const prevSeat = seats.find(
        (s) =>
          s.salon === seat.salon &&
          s.column === seat.column &&
          s.row === seat.row - 1 &&
          s.side === seat.side
      );
      if (prevSeat?.student?.grade === seat.student.grade) {
        violations.push({
          salonName: sName,
          message: `${seat.student.number} (${seat.student.grade}.Sınıf) öğrenci, başka bir ${seat.student.grade}. sınıfın hemen arkasında!`,
          seatRef: seat,
        });
      }
    }

    // 3. Same Grade Side-by-Side
    if (rules.avoidSameGradeSideBySide) {
      const neighbor = seats.find(
        (s) =>
          s.salon === seat.salon &&
          s.column === seat.column &&
          s.row === seat.row &&
          s.side !== seat.side
      );
      if (neighbor?.student?.grade === seat.student.grade && seat.side === 'left') { // Only register once per pair
        violations.push({
          salonName: sName,
          message: `${seat.student.number} ve ${neighbor.student.number} aynı sınıfta (${seat.student.grade}) yan yana.`,
          seatRef: seat,
        });
        violations.push({
          salonName: sName,
          message: `${neighbor.student.number} ve ${seat.student.number} aynı sınıfta (${seat.student.grade}) yan yana.`,
          seatRef: neighbor,
        });
      }
    }

    // 4. Girl/Boy Side-by-Side
    if (rules.avoidMixedGenderSideBySide && seat.student.gender) {
      const neighbor = seats.find(
        (s) =>
          s.salon === seat.salon &&
          s.column === seat.column &&
          s.row === seat.row &&
          s.side !== seat.side
      );
      
      if (neighbor?.student?.gender && neighbor.student.gender !== seat.student.gender && seat.side === 'left') {
        const genders = seat.student.gender === 'K' ? 'Kız/Erkek' : 'Erkek/Kız';
        violations.push({
          salonName: sName,
          message: `${seat.student.number} ve ${neighbor.student.number} birbirine zıt cinsiyette yan yana (${genders}).`,
          seatRef: seat,
        });
        violations.push({
          salonName: sName,
          message: `${neighbor.student.number} ve ${seat.student.number} birbirine zıt cinsiyette yan yana.`,
          seatRef: neighbor,
        });
      }
    }

    // 5. Same Grade Behind
    if (rules.avoidSameGradeBehind) {
      const front = seats.find(
        (s) =>
          s.salon === seat.salon &&
          s.column === seat.column &&
          s.row === seat.row - 1 &&
          s.side === seat.side
      );
      if (front?.student?.grade === seat.student.grade) {
        violations.push({
          salonName: sName,
          message: `${seat.student.number} ve ${front.student.number} aynı sınıfta (${seat.student.grade}) arka arkaya.`,
          seatRef: seat,
        });
      }
    }
  }

  // Remove exact duplicates from array
  return violations.filter(
    (v, index, self) =>
      index ===
      self.findIndex(
        (t) => t.message === v.message && t.seatRef === v.seatRef
      )
  );
}
