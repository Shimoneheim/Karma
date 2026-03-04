import type { Student, Seat, AssignmentRules, AssignSeatsOptions, SalonLayout, AssignmentResult } from "./types";
import { defaultAssignmentRules, defaultSalons, MAX_RETRIES_DEFAULT, MAX_RETRIES_LIMIT, GHOST_STUDENT_GRADE } from "./constants";
import { generateSeats, shuffle } from "./helpers";
import { calculateQualityScore } from "./scoring";

interface Desk {
  salon: number;
  row: number;
  column: number;
  left: Seat;
  right: Seat;
}

export function assignSeats(
  studentsInput: Student[],
  options: AssignSeatsOptions = {}
): AssignmentResult {
  const engine = new SeatingEngine(studentsInput, options);
  const result = engine.runCore();
  
  let deadlockResolved = false;

  // Deadlock Resolution Phase
  if (result.unassigned.length > 0) {
    const emptySeats = result.seats.filter(s => !s.student);
    if (emptySeats.length > 0) {
       deadlockResolved = engine.resolveDeadlocks(result.seats, result.unassigned, emptySeats);
    }
  }

  const qualityScore = calculateQualityScore(result.seats, result.unassigned, studentsInput.length, options.rules);

  return {
    seats: result.seats,
    unassigned: result.unassigned,
    qualityScore,
    deadlockResolved
  };
}

class SeatingEngine {
  private rules: AssignmentRules;
  private layoutConfig: SalonLayout[];
  private maxRetries: number;
  private maxGrade: number;
  private isHighSchool: boolean;
  private highestGrade: number;
  private gradeCounts: Record<number, number> = {};
  
  constructor(private studentsInput: Student[], private options: AssignSeatsOptions = {}) {
    this.maxRetries = Math.min(options.maxRetries ?? MAX_RETRIES_DEFAULT, MAX_RETRIES_LIMIT);
    this.rules = { ...defaultAssignmentRules, ...(options.rules ?? {}) };
    this.layoutConfig = options.salons && options.salons.length > 0 ? options.salons : defaultSalons;
    
    this.maxGrade = studentsInput.length > 0 ? Math.max(...studentsInput.map(s => s.grade)) : 8;
    this.isHighSchool = this.maxGrade >= 9;
    this.highestGrade = this.maxGrade;

    // Pre-calculate grade counts for small-class prioritization
    studentsInput.forEach(s => {
        this.gradeCounts[s.grade] = (this.gradeCounts[s.grade] || 0) + 1;
    });
  }

  private getSalonCapacity(salonId: number): number {
    const s = this.layoutConfig.find(l => l.id === salonId);
    return (s?.rows || 0) * (s?.columns || 0) * 2;
  }

  private needsWall(s: Student): boolean {
    return s.grade !== GHOST_STUDENT_GRADE && !s.isGhost && (this.isHighSchool ? s.grade === 12 : s.grade === 8);
  }

  public runCore(): { seats: Seat[]; unassigned: Student[] } {
    let bestAttempt: { seats: Seat[]; unassigned: Student[] } | null = null;
    let leastUnassigned = Infinity;
    let bestQuality = -1;
    let iterationsSinceImprovement = 0;

    for (let retry = 0; retry < this.maxRetries; retry++) {
      const seats = generateSeats(this.layoutConfig);
      const desks = this.buildDesks(seats);
      let availableStudents = shuffle([...this.studentsInput]);

      this.applyLockedSeats(seats, availableStudents);

      // 1. Partial locked desks
      this.handlePartiallyLockedDesks(desks, availableStudents);

      // 2. Pad with ghosts
      this.determineGhostTargets(seats, availableStudents);
      availableStudents = shuffle(availableStudents);

      // Stability Optimization: Seniors first, then smaller classes first 
      // This allows small classes to "pick" their ideal partners (like ghosts) earlier in the queue.
      availableStudents.sort((a, b) => {
          const aS = this.needsWall(a) ? 1 : 0;
          const bS = this.needsWall(b) ? 1 : 0;
          if (aS !== bS) return bS - aS;
          
          if (!a.isGhost && !b.isGhost) {
              const countA = this.gradeCounts[a.grade] || 0;
              const countB = this.gradeCounts[b.grade] || 0;
              if (countA !== countB) return countA - countB;
          }

          if (a.isGhost && !b.isGhost) return 1;
          if (!a.isGhost && b.isGhost) return -1;
          return 0;
      });

      // 3. Matchmaker
      const pairs = this.performMatchmaking(availableStudents);
      this.pairSwapOptimization(pairs);

      // 4. Distribute Pairs
      this.distributeToFullyEmptyDesks(desks, pairs, seats);
      this.distributeToSalons(desks, pairs);

      // 5. Post Optimization
      this.optimizeDeskArrangements(desks, seats);

      const unassigned: Student[] = availableStudents.filter(s => !s.isGhost);
      for (const pair of pairs) {
          if (!pair[0].isGhost) unassigned.push(pair[0]);
          if (!pair[1].isGhost) unassigned.push(pair[1]);
      }

      const currentScore = calculateQualityScore(seats, unassigned, this.studentsInput.length, this.rules);
      
      if (unassigned.length < leastUnassigned || (unassigned.length === leastUnassigned && currentScore > bestQuality)) {
        leastUnassigned = unassigned.length;
        bestQuality = currentScore;
        bestAttempt = { seats, unassigned };
        iterationsSinceImprovement = 0;
        
        if (unassigned.length === 0 && currentScore >= 98) {
            return { seats, unassigned };
        }
      } else {
        iterationsSinceImprovement++;
      }

      if (iterationsSinceImprovement > 40 && retry > 60 && bestQuality > 85) break;
    }

    return bestAttempt || { seats: generateSeats(this.layoutConfig), unassigned: this.studentsInput };
  }

  private buildDesks(seats: Seat[]): Desk[] {
    const desks: Desk[] = [];
    const seatKeys = [...new Set(seats.map(s => `${s.salon}-${s.row}-${s.column}`))];
    for (const key of seatKeys) {
        const parts = key.split('-');
        const salon = parseInt(parts[0], 10);
        const row = parseInt(parts[1], 10);
        const col = parseInt(parts[2], 10);
        const left = seats.find(s => s.salon === salon && s.row === row && s.column === col && s.side === 'left');
        const right = seats.find(s => s.salon === salon && s.row === row && s.column === col && s.side === 'right');
        if (left && right) {
            desks.push({ salon, row, column: col, left, right });
        }
    }
    return desks;
  }

  private applyLockedSeats(seats: Seat[], availableStudents: Student[]) {
    if (!this.options.lockedSeats) return;
    
    this.options.lockedSeats.forEach(lockedSeat => {
      const targetSeat = seats.find(s => s.salon === lockedSeat.salon && s.column === lockedSeat.column && s.row === lockedSeat.row && s.side === lockedSeat.side);
      if (targetSeat && lockedSeat.student && lockedSeat.isLocked) {
        targetSeat.student = lockedSeat.student;
        targetSeat.isLocked = true;
      }
    });

    const lockedStudentNumbers = this.options.lockedSeats
        .filter(seat => seat.student && seat.isLocked)
        .map(seat => seat.student!.number);
        
    for (let i = availableStudents.length - 1; i >= 0; i--) {
        if (lockedStudentNumbers.includes(availableStudents[i].number)) {
            availableStudents.splice(i, 1);
        }
    }
  }

  private fillSingleSeat(seatToFill: Seat, lockedSeat: Seat, availableStudents: Student[]) {
    if (availableStudents.length === 0) return;
    const lockedStudent = lockedSeat.student!;
    let bestScore = -Infinity;
    let bestIdx = -1;
    
    for (let j = 0; j < availableStudents.length; j++) {
        const cand = availableStudents[j];
        let score = 50;
        if (this.rules.avoidSameGradeSideBySide && cand.grade === lockedStudent.grade) score -= 40;
        if (this.rules.avoidMixedGenderSideBySide && cand.gender && lockedStudent.gender && cand.gender !== lockedStudent.gender) score -= 15;
        if (this.rules.enforceInnerOuterRule) {
            const s1MustWall = this.isHighSchool ? (cand.grade === 12) : (cand.grade === 8);
            const s1MustCorridor = this.isHighSchool ? (cand.grade <= 10) : (cand.grade <= 6);

            if (seatToFill.isOuter) {
                if (s1MustWall) score += 30;
                if (s1MustCorridor) score -= 30;
            } else {
                if (s1MustWall) score -= 30;
                if (s1MustCorridor) score += 30;
            }
        }
        if (this.options.studentConstraints) {
            for (const c of this.options.studentConstraints) {
              if (c.type === "avoidTogether" && c.studentNames.includes(cand.name) && c.studentNames.includes(lockedStudent.name)) score -= 100;
            }
        }
        score += Math.random() * 2;
        if (score > bestScore) {
            bestScore = score;
            bestIdx = j;
        }
    }
    
    if (bestIdx !== -1) {
        seatToFill.student = availableStudents[bestIdx];
        availableStudents.splice(bestIdx, 1);
    }
  }

  private handlePartiallyLockedDesks(desks: Desk[], availableStudents: Student[]) {
    for (const desk of desks) {
        const leftLocked = desk.left.student && desk.left.isLocked;
        const rightLocked = desk.right.student && desk.right.isLocked;
        if (leftLocked && !desk.right.student) this.fillSingleSeat(desk.right, desk.left, availableStudents);
        if (rightLocked && !desk.left.student) this.fillSingleSeat(desk.left, desk.right, availableStudents);
    }
  }

  private determineGhostTargets(seats: Seat[], availableStudents: Student[]) {
    const emptySeatCount = seats.filter(s => !s.student).length;
    const paddingCount = emptySeatCount - availableStudents.length;
    
    const malesPre = availableStudents.filter(s => s.gender === 'E').length;
    const femalesPre = availableStudents.filter(s => s.gender === 'K').length;
    const ghostTargets: ('E' | 'K')[] = [];

    if (paddingCount > 0 && this.rules.avoidMixedGenderSideBySide) {
        let mOdd = malesPre % 2 === 1;
        let fOdd = femalesPre % 2 === 1;
        
        for (let j = 0; j < paddingCount; j++) {
            if (mOdd) { ghostTargets.push('E'); mOdd = false; }
            else if (fOdd) { ghostTargets.push('K'); fOdd = false; }
            else {
                ghostTargets.push(femalesPre > malesPre ? 'K' : 'E');
            }
        }
    }

    if (paddingCount > 0) {
        // Prepare weighted randomization for variety while favoring small classes
        const grades = Object.keys(this.gradeCounts).map(Number);
        
        for (let j = 0; j < paddingCount; j++) {
            const ghost: Student = { 
                number: `EMPTY_${Math.random().toString(36).substr(2, 5)}`, 
                name: "BOŞ", 
                grade: GHOST_STUDENT_GRADE, 
                isGhost: true 
            };
            if (ghostTargets[j]) (ghost as any).targetGender = ghostTargets[j];
            
            // Weighted selection: Inversely proportional to class size
            if (grades.length > 0) {
                const totalReversed = grades.reduce((acc, g) => acc + (1 / this.gradeCounts[g]), 0);
                let r = Math.random() * totalReversed;
                let targetGrade = grades[0];
                for (const g of grades) {
                    r -= (1 / this.gradeCounts[g]);
                    if (r <= 0) {
                        targetGrade = g;
                        break;
                    }
                }
                (ghost as any).preferredGrade = targetGrade;
            }

            availableStudents.push(ghost);
        }
    }
  }

  private getPairScore(s1: Student, s2: Student): number {
    let score = 100;
    if (s1.isGhost && s2.isGhost) return -5000;
    
    if (s1.isGhost || s2.isGhost) {
        const real = s1.isGhost ? s2 : s1;
        const ghost = s1.isGhost ? s1 : s2;
        
        if (this.needsWall(real)) score += 150; // Favor seniors next to empty seats
        
        // Small class prioritization: Significant bonus to outcompete other pairing options
        if ((ghost as any).preferredGrade === real.grade) {
            score += 1500; 
        }

        if (this.rules.avoidMixedGenderSideBySide) {
            const target = (ghost as any).targetGender;
            if (target && real.gender) {
                if (real.gender === target) score += 300;
                else score -= 300;
            }
        }
    } else {
        if (this.rules.avoidMixedGenderSideBySide && s1.gender && s2.gender) {
            if (s1.gender === s2.gender) score += 200;
            else score -= 1000; // Increased to compete with grade penalty
        }

        if (s1.grade !== s2.grade) score += 200;
        else score -= 1200; // Balanced: strong but not overwhelming

        if (this.rules.enforceInnerOuterRule) {
            const isJS = !this.isHighSchool;
            const s1MustWall = this.isHighSchool ? (s1.grade === 12) : (s1.grade === 8);
            const s1MustCorridor = this.isHighSchool ? (s1.grade <= 10) : (s1.grade <= 6);
            const s2MustWall = this.isHighSchool ? (s2.grade === 12) : (s2.grade === 8);
            const s2MustCorridor = this.isHighSchool ? (s2.grade <= 10) : (s2.grade <= 6);

            if (s1MustWall && s2MustWall) score -= 1000;
            else if (s1MustCorridor && s2MustCorridor) score -= 1000;
            else if ((s1MustWall && s2MustCorridor) || (s1MustCorridor && s2MustWall)) score += 500;
            else if (s1MustWall || s2MustWall) score += 200;
        }

        if (this.options.studentConstraints) {
            for (const c of this.options.studentConstraints) {
                if (c.type === "avoidTogether" && c.studentNames.includes(s1.name) && c.studentNames.includes(s2.name)) score -= 100;
            }
        }
    }
    return score;
  }

  private performMatchmaking(availableStudents: Student[]): [Student, Student][] {
    const pairs: [Student, Student][] = [];
    while (availableStudents.length >= 2) {
        const student1 = availableStudents.shift()!;
        let bestScore = -Infinity;
        let bestIdx = 0;
        
        for (let j = 0; j < availableStudents.length; j++) {
            const cand = availableStudents[j];
            const score = this.getPairScore(student1, cand) + (Math.random() * 2);
            if (score > bestScore) {
                bestScore = score;
                bestIdx = j;
            }
        }
        
        const student2 = availableStudents[bestIdx];
        availableStudents.splice(bestIdx, 1);
        pairs.push([student1, student2]);
    }
    return pairs;
  }

  private pairSwapOptimization(pairs: [Student, Student][]) {
    const pairSwapIterations = pairs.length * 10;
    for (let i = 0; i < pairSwapIterations; i++) {
        const idx1 = Math.floor(Math.random() * pairs.length);
        const idx2 = Math.floor(Math.random() * pairs.length);
        if (idx1 === idx2) continue;

        const p1 = pairs[idx1];
        const p2 = pairs[idx2];
        const currentScore = this.getPairScore(p1[0], p1[1]) + this.getPairScore(p2[0], p2[1]);

        const swap1Score = this.getPairScore(p1[0], p2[0]) + this.getPairScore(p1[1], p2[1]);
        if (swap1Score > currentScore) {
            const temp = p1[1];
            p1[1] = p2[0];
            p2[0] = temp;
            continue;
        }

        const swap2Score = this.getPairScore(p1[0], p2[1]) + this.getPairScore(p1[1], p2[0]);
        if (swap2Score > currentScore) {
            const temp = p1[1];
            p1[1] = p2[1];
            p2[1] = temp;
        }
    }
  }

  private distributeToFullyEmptyDesks(desks: Desk[], pairs: [Student, Student][], seats: Seat[]) {
    const emptyDesks = shuffle(desks.filter(d => !d.left.student && !d.right.student));
    
    const isHardViolation = (desk: Desk, pair: [Student, Student]) => {
        if (this.rules.enforceGrade8VerticalRule) {
            const hasHighest = (pair[0].grade === this.highestGrade || pair[1].grade === this.highestGrade);
            if (hasHighest) {
                const leftPrev = seats.find(s => s.salon === desk.salon && s.column === desk.column && s.row === desk.row - 1 && s.side === 'left');
                const rightPrev = seats.find(s => s.salon === desk.salon && s.column === desk.column && s.row === desk.row - 1 && s.side === 'right');
                if (leftPrev?.student?.grade === this.highestGrade) return true;
                if (rightPrev?.student?.grade === this.highestGrade) return true;
                const leftNext = seats.find(s => s.salon === desk.salon && s.column === desk.column && s.row === desk.row + 1 && s.side === 'left');
                const rightNext = seats.find(s => s.salon === desk.salon && s.column === desk.column && s.row === desk.row + 1 && s.side === 'right');
                if (leftNext?.student?.grade === this.highestGrade) return true;
                if (rightNext?.student?.grade === this.highestGrade) return true;
            }
        }
        return false;
    };

    for (const desk of emptyDesks) {
        if (pairs.length === 0) break;
        let bestScore = -Infinity;
        let bestPairIdx = -1;
        
        for (let j=0; j<pairs.length; j++) {
            const pair = pairs[j];
            let score = 50;
            
            if (isHardViolation(desk, pair)) score -= 1000;
            
            const isGhost0 = pair[0].isGhost;
            const isGhost1 = pair[1].isGhost;
            
            // Prioritize smaller salons for ghost-student pairs
            if (isGhost0 || isGhost1) {
                const salonCap = this.getSalonCapacity(desk.salon);
                // Heavy bonus for smaller rooms to encourage ghost placement there
                score += (60 - salonCap) * 15; 
            }
            
            if (this.rules.avoidSameGradeBehind && (!isGhost0 || !isGhost1)) {
                const leftPrev = seats.find(s => s.salon === desk.salon && s.column === desk.column && s.row === desk.row - 1 && s.side === 'left');
                const rightPrev = seats.find(s => s.salon === desk.salon && s.column === desk.column && s.row === desk.row - 1 && s.side === 'right');
                const leftNext = seats.find(s => s.salon === desk.salon && s.column === desk.column && s.row === desk.row + 1 && s.side === 'left');
                const rightNext = seats.find(s => s.salon === desk.salon && s.column === desk.column && s.row === desk.row + 1 && s.side === 'right');
                
                if (leftPrev?.student && !isGhost0 && leftPrev.student.grade === pair[0].grade) score -= 200;
                if (rightPrev?.student && !isGhost1 && rightPrev.student.grade === pair[1].grade) score -= 200;
                if (leftNext?.student && !isGhost0 && leftNext.student.grade === pair[0].grade) score -= 200;
                if (rightNext?.student && !isGhost1 && rightNext.student.grade === pair[1].grade) score -= 200;
            }

            if (this.rules.avoidSameGradeDiagonally && (!isGhost0 || !isGhost1)) {
                const diagonals = [
                    { r: desk.row - 1, c: desk.column, side: 'right' },
                    { r: desk.row - 1, c: desk.column, side: 'left' },
                    { r: desk.row + 1, c: desk.column, side: 'right' },
                    { r: desk.row + 1, c: desk.column, side: 'left' }
                ];
                diagonals.forEach(d => {
                    const neighbor = seats.find(s => s.salon === desk.salon && s.column === d.c && s.row === d.r && s.side === (d.side as any));
                    if (neighbor && neighbor.student) {
                        if (!isGhost0 && neighbor.student.grade === pair[0].grade) score -= 15;
                        if (!isGhost1 && neighbor.student.grade === pair[1].grade) score -= 15;
                    }
                });
            }
            
            if (!isGhost0 || !isGhost1) {
              const getSurname = (name: string) => name.trim().split(/\s+/).pop()?.toLowerCase();
              const s1Surname = !isGhost0 ? getSurname(pair[0].name) : null;
              const s2Surname = !isGhost1 ? getSurname(pair[1].name) : null;
              if (s1Surname && s2Surname && s1Surname === s2Surname) score -= 100;
            }

            if (this.rules.enforceInnerOuterRule) {
                const isJS = !this.isHighSchool;
                const s0MustWall = (isJS && pair[0].grade === 8) || (this.isHighSchool && pair[0].grade === 12);
                const s0MustCorridor = (isJS && pair[0].grade <= 6) || (this.isHighSchool && pair[0].grade <= 10);
                const s1MustWall = (isJS && pair[1].grade === 8) || (this.isHighSchool && pair[1].grade === 12);
                const s1MustCorridor = (isJS && pair[1].grade <= 6) || (this.isHighSchool && pair[1].grade <= 10);

                const deskHasWall = desk.left.isOuter || desk.right.isOuter;
                const deskHasCorridor = !desk.left.isOuter || !desk.right.isOuter;

                if (s0MustWall && !deskHasWall) score -= 100;
                if (s1MustWall && !deskHasWall) score -= 100;
                if (s0MustCorridor && !deskHasCorridor) score -= 100;
                if (s1MustCorridor && !deskHasCorridor) score -= 100;
                
                if ((s0MustWall || s1MustWall) && deskHasWall) score += 50;
                if ((s0MustCorridor || s1MustCorridor) && deskHasCorridor) score += 50;
            }
            
            score += Math.random() * 2;
            
            if (score > bestScore) {
                bestScore = score;
                bestPairIdx = j;
            }
        }
        
        if (bestPairIdx !== -1) {
            const pickedPair = pairs.splice(bestPairIdx, 1)[0];
            let studentA = pickedPair[0];
            let studentB = pickedPair[1];
            
            if (desk.left.isOuter && !desk.right.isOuter) {
                if (studentA.isGhost && !studentB.isGhost) [studentA, studentB] = [studentB, studentA];
                else if (this.rules.enforceInnerOuterRule) {
                    if (!studentA.isGhost && !studentB.isGhost && studentA.grade < studentB.grade) [studentA, studentB] = [studentB, studentA];
                    else if (this.needsWall(studentB)) [studentA, studentB] = [studentB, studentA];
                }
            } else if (!desk.left.isOuter && desk.right.isOuter) {
                if (studentB.isGhost && !studentA.isGhost) [studentA, studentB] = [studentB, studentA];
                else if (this.rules.enforceInnerOuterRule) {
                    if (!studentA.isGhost && !studentB.isGhost && studentA.grade > studentB.grade) [studentA, studentB] = [studentB, studentA];
                    else if (this.needsWall(studentA)) [studentA, studentB] = [studentB, studentA];
                }
            }
            
            desk.left.student = studentA.isGhost ? null : studentA;
            desk.right.student = studentB.isGhost ? null : studentB;
        }
    }
  }

  private distributeToSalons(desks: Desk[], pairs: [Student, Student][]) {
    const wallPairs = pairs.filter(p => this.needsWall(p[0]) || this.needsWall(p[1]));
    const normalPairs = pairs.filter(p => !(this.needsWall(p[0]) || this.needsWall(p[1])));
    
    const salonIds = [...new Set(desks.map(d => d.salon))];
    const desksBySalon: Record<number, Desk[]> = {};
    salonIds.forEach(id => {
        desksBySalon[id] = shuffle(desks.filter(d => d.salon === id && !d.left.student && !d.right.student));
    });

    const distributePairsList = (pairList: [Student, Student][]) => {
        let salonIdx = 0;
        for (const pair of pairList) {
            let found = false;
            for (let i = 0; i < salonIds.length; i++) {
                const sId = salonIds[(salonIdx + i) % salonIds.length];
                const availableDesks = desksBySalon[sId];
                if (availableDesks.length > 0) {
                    const desk = availableDesks.shift()!;
                    let studentA = pair[0];
                    let studentB = pair[1];

                    if (this.rules.enforceInnerOuterRule) {
                        if (desk.left.isOuter && !desk.right.isOuter) {
                            if (!studentA.isGhost && !studentB.isGhost && studentA.grade < studentB.grade) [studentA, studentB] = [studentB, studentA];
                            else if (this.needsWall(studentB)) [studentA, studentB] = [studentB, studentA];
                        } else if (!desk.left.isOuter && desk.right.isOuter) {
                            if (!studentA.isGhost && !studentB.isGhost && studentA.grade > studentB.grade) [studentA, studentB] = [studentB, studentA];
                            else if (this.needsWall(studentA)) [studentA, studentB] = [studentB, studentA];
                        }
                    }

                    desk.left.student = studentA.isGhost ? null : studentA;
                    desk.right.student = studentB.isGhost ? null : studentB;
                    found = true;
                    salonIdx = (salonIdx + i + 1) % salonIds.length;
                    break;
                }
            }
            if (!found) break;
        }
    };

    distributePairsList(wallPairs);
    distributePairsList(normalPairs);
  }

  private optimizeDeskArrangements(desks: Desk[], seats: Seat[]) {
    const desksWithStudents = desks.filter(d => d.left.student || d.right.student);
    const deskSwapIterations = desksWithStudents.length * 20;

    for (let i = 0; i < deskSwapIterations; i++) {
        const d1 = desks[Math.floor(Math.random() * desks.length)];
        const d2 = desks[Math.floor(Math.random() * desks.length)];
        
        if (d1 === d2 || d1.salon !== d2.salon) continue; 

        const getDeskViolations = (desk: Desk) => {
            let v = 0;
            const deskStudents = [desk.left, desk.right];
            
            deskStudents.forEach(seat => {
                if (!seat.student) return;
                if (this.rules.enforceInnerOuterRule) {
                    if (this.needsWall(seat.student) && !seat.isOuter) v += 1000;
                }
            });

            if (this.rules.enforceInnerOuterRule && desk.left.student && desk.right.student) {
                const wallS = desk.left.isOuter ? desk.left : desk.right;
                const corrS = desk.left.isOuter ? desk.right : desk.left;
                if (wallS.student && corrS.student && wallS.student.grade < corrS.student.grade) v += 500;
            }

            const wallSeatRef = desk.left.isOuter ? desk.left : (desk.right.isOuter ? desk.right : null);
            const corridorSeatRef = desk.left.isOuter ? desk.right : (desk.right.isOuter ? desk.left : null);
            if (wallSeatRef && corridorSeatRef) {
                if (!wallSeatRef.student && corridorSeatRef.student) v += 5000;
            }

            deskStudents.forEach(seat => {
                if (!seat.student) return;
                const matches = (rOff: number, cOff: number, side: 'left' | 'right') => {
                    const n = seats.find(s => s.salon === seat.salon && s.column === seat.column + cOff && s.row === seat.row + rOff && s.side === side);
                    return n?.student?.grade === seat.student!.grade;
                };

                if (matches(-1, 0, seat.side) || matches(1, 0, seat.side)) {
                    v += (this.needsWall(seat.student!) ? 200 : 20);
                }
                if (this.rules.avoidSameGradeDiagonally) {
                    const otherSide: 'left' | 'right' = seat.side === 'left' ? 'right' : 'left';
                    if (matches(-1, 0, otherSide) || matches(1, 0, otherSide)) v += 15;
                }
                if (this.rules.avoidTopGradeDiagonally && seat.student!.grade === this.highestGrade) {
                    const otherSide: 'left' | 'right' = seat.side === 'left' ? 'right' : 'left';
                    if (matches(-1, 0, otherSide) || matches(1, 0, otherSide)) v += 100;
                }
            });
            return v;
        };

        const oldL1 = d1.left.student; const oldR1 = d1.right.student;
        const oldL2 = d2.left.student; const oldR2 = d2.right.student;

        const currentV = getDeskViolations(d1) + getDeskViolations(d2);
        
        d1.left.student = oldL2; d1.right.student = oldR2;
        d2.left.student = oldL1; d2.right.student = oldR1;

        [d1, d2].forEach(d => {
            if (this.rules.enforceInnerOuterRule && (d.left.student || d.right.student)) {
                let sA = d.left.student; let sB = d.right.student;
                if (!sA && sB && d.left.isOuter && this.needsWall(sB)) [d.left.student, d.right.student] = [d.right.student, d.left.student];
                else if (sA && !sB && d.right.isOuter && this.needsWall(sA)) [d.left.student, d.right.student] = [d.right.student, d.left.student];
                else if (sA && sB) {
                    const wallNeedsSwap = d.left.isOuter ? (sA.grade < sB.grade || this.needsWall(sB)) : (sB.grade < sA.grade || this.needsWall(sA));
                    if (wallNeedsSwap) [d.left.student, d.right.student] = [d.right.student, d.left.student];
                }
            }
        });

        const newV = getDeskViolations(d1) + getDeskViolations(d2);
        if (newV > currentV) {
            d1.left.student = oldL1; d1.right.student = oldR1;
            d2.left.student = oldL2; d2.right.student = oldR2;
        }
    }
  }

  public resolveDeadlocks(seats: Seat[], unassignedPool: Student[], emptySeats: Seat[]): boolean {
    let resolved = false;
    for (const emptySeat of emptySeats) {
        if (emptySeat.student && emptySeat.isLocked) continue;
        if (unassignedPool.length === 0) break;
        
        let bestScore = -Infinity;
        let bestIndex = 0;
        
        for (let i = 0; i < unassignedPool.length; i++) {
        const student = unassignedPool[i];
        let score = 0;
        
        if (this.rules.enforceInnerOuterRule) {
            const isMustWall = this.isHighSchool ? (student.grade === 12) : (student.grade === 8);
            const isMustCorridor = this.isHighSchool ? (student.grade <= 10) : (student.grade <= 6);
            
            if (emptySeat.isOuter && isMustCorridor) score -= 500;
            if (!emptySeat.isOuter && isMustWall) score -= 500;
        }
        if (this.rules.enforceGrade8VerticalRule && student.grade === this.highestGrade) {
            const prevSeat = seats.find(s => s.salon === emptySeat.salon && s.column === emptySeat.column && s.row === emptySeat.row - 1 && s.side === emptySeat.side);
            if (prevSeat && prevSeat.student?.grade === this.highestGrade) score -= 50;
        }
        if (this.rules.avoidSameGradeSideBySide) {
            const neighbor = seats.find(s => s.salon === emptySeat.salon && s.column === emptySeat.column && s.row === emptySeat.row && s.side !== emptySeat.side);
            if (neighbor && neighbor.student?.grade === student.grade) score -= 10;
        }
        if (this.rules.avoidMixedGenderSideBySide && student.gender) {
            const neighbor = seats.find(s => s.salon === emptySeat.salon && s.column === emptySeat.column && s.row === emptySeat.row && s.side !== emptySeat.side);
            if (neighbor && neighbor.student?.gender && neighbor.student.gender !== student.gender) score -= 10;
        }
        if (this.rules.avoidSameGradeBehind) {
            const front = seats.find(s => s.salon === emptySeat.salon && s.column === emptySeat.column && s.row === emptySeat.row - 1 && s.side === emptySeat.side);
            if (front && front.student?.grade === student.grade) score -= 10;
        }
        if (this.rules.avoidSameGradeDiagonally) {
            const diagonals = [
            { r: emptySeat.row - 1, c: emptySeat.column, side: emptySeat.side === 'left' ? 'right' : 'left' },
            { r: emptySeat.row + 1, c: emptySeat.column, side: emptySeat.side === 'left' ? 'right' : 'left' }
            ];
            diagonals.forEach(d => {
            const neighbor = seats.find(s => s.salon === emptySeat.salon && s.column === d.c && s.row === d.r && s.side === d.side);
            if (neighbor && neighbor.student?.grade === student.grade) score -= 5;
            });
        }
        
        if (score > bestScore) {
            bestScore = score;
            bestIndex = i;
        }
        }
        
        emptySeat.student = unassignedPool[bestIndex];
        unassignedPool.splice(bestIndex, 1);
        resolved = true;
    }
    return resolved;
  }
}
