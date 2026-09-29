import type { Seat, Student, AssignmentRules } from "./types";
import { defaultAssignmentRules, GHOST_STUDENT_GRADE } from "./constants";
import { buildSeatIndex, seatKey } from "./helpers";

export function calculateQualityScore(
  seats: Seat[],
  unassigned: Student[],
  totalStudents: number,
  rulesInput?: Partial<AssignmentRules>
): number {
  if (totalStudents === 0) return 0;
  
  // Calculate max grade for dynamic rules
  const allStudentsInvolved = seats.map(s => s.student).filter(s => s !== null) as Student[];
  allStudentsInvolved.push(...unassigned);
  const allRealStudents = allStudentsInvolved.filter(s => s.grade !== GHOST_STUDENT_GRADE && !s.isGhost);
  const maxGrade = allRealStudents.length > 0 ? Math.max(...allRealStudents.map(s => s.grade)) : 8;
  const isHighSchool = maxGrade >= 9;
  const highestGrade = isHighSchool ? 12 : 8;
  const rules = { ...defaultAssignmentRules, ...(rulesInput || {}) };
  let currentScore = 100;
  
  if (unassigned.length > 0) {
    const unassignedPenalty = (unassigned.length / totalStudents) * 50;
    currentScore -= unassignedPenalty;
  }
  
  const seatIndex = buildSeatIndex(seats);
  const at = (salon: number, column: number, row: number, side: Seat["side"]) =>
    seatIndex.get(seatKey(salon, column, row, side));

  let layoutViolations = 0;
  let studentsAssigned = 0;
  seats.forEach(seat => {
    if (!seat.student) return;
    studentsAssigned++;
    const student = seat.student;
    
    // Check Inner/Outer rule
    // Check Inner/Outer rule
    if (rules.enforceInnerOuterRule) {
      const isMustWall = isHighSchool ? (student.grade === 12) : (student.grade === 8);
      const isMustCorridor = isHighSchool ? (student.grade <= 10) : (student.grade <= 6);
      
      if (isMustWall && !seat.isOuter) layoutViolations += 10;
      else if (isMustWall && seat.isOuter) layoutViolations -= 2; 

      const neighbor = at(seat.salon, seat.column, seat.row, seat.side === 'left' ? 'right' : 'left');
      const isJuniorAtWall = isMustCorridor && seat.isOuter;
      // Penalty ONLY if junior is on wall AND neighbor is occupied
      if (isJuniorAtWall && neighbor?.student && !neighbor.student.isGhost && 
          neighbor.student.grade !== GHOST_STUDENT_GRADE && 
          neighbor.student.grade > student.grade) {
          layoutViolations += 5; 
      }

      if (neighbor?.student && neighbor.student.grade !== GHOST_STUDENT_GRADE && !neighbor.student.isGhost && seat.side === 'left') {
          const wallSeat = seat.isOuter ? seat : neighbor;
          const corrSeat = seat.isOuter ? neighbor : seat;
          if (wallSeat.student && corrSeat.student && wallSeat.student.grade < corrSeat.student.grade) {
            layoutViolations += 5; 
          }
      }
    }
    
    // Check Vertical separation for the highest grade
    if (rules.enforceGrade8VerticalRule && (student.grade === 8 || student.grade === 12)) {
      const prevSeat = at(seat.salon, seat.column, seat.row - 1, seat.side);
      if (prevSeat && prevSeat.student?.grade === student.grade) layoutViolations += 50; 
    }
    
    // Check Same grade side-by-side
    if (rules.avoidSameGradeSideBySide) {
      const neighbor = at(seat.salon, seat.column, seat.row, seat.side === 'left' ? 'right' : 'left');
      if (neighbor && neighbor.student?.grade === student.grade) layoutViolations += 50;
    }

    // Check Mixed Gender side-by-side
    if (rules.avoidMixedGenderSideBySide && student.gender) {
      const neighbor = at(seat.salon, seat.column, seat.row, seat.side === 'left' ? 'right' : 'left');
      if (neighbor && neighbor.student?.gender && neighbor.student.gender !== student.gender) layoutViolations += 35;
    }

    // Check Same grade diagonally
    if (rules.avoidSameGradeDiagonally) {
      const otherSide: 'left' | 'right' = seat.side === 'left' ? 'right' : 'left';
      const diagonals = [
        { r: seat.row - 1, c: seat.column, side: otherSide },
        { r: seat.row + 1, c: seat.column, side: otherSide }
      ];
      diagonals.forEach(d => {
        const neighbor = at(seat.salon, d.c, d.r, d.side);
        if (neighbor && neighbor.student?.grade === student.grade) layoutViolations += 2;
      });
    }

    // Check Top grade diagonally
    if (rules.avoidTopGradeDiagonally && student.grade === highestGrade) {
      const otherSide: 'left' | 'right' = seat.side === 'left' ? 'right' : 'left';
      const diagonals = [
        { r: seat.row - 1, c: seat.column, side: otherSide },
        { r: seat.row + 1, c: seat.column, side: otherSide }
      ];
      diagonals.forEach(d => {
        const neighbor = at(seat.salon, d.c, d.r, d.side);
        if (neighbor && neighbor.student?.grade === student.grade) layoutViolations += 20; 
      });
    }
    
    // Check Same grade behind
    if (rules.avoidSameGradeBehind) {
      const front = at(seat.salon, seat.column, seat.row - 1, seat.side);
      if (front && front.student?.grade === student.grade) {
        layoutViolations += 5; 
      }
    }
  });

  if (studentsAssigned > 0) {
    const maxViolations = studentsAssigned * 15;
    const violationPenalty = (layoutViolations / maxViolations) * 50; 
    currentScore -= violationPenalty;
  }
  
  return Math.max(0, Math.round(currentScore));
}
