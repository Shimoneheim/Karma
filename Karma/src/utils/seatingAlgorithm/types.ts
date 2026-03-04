export interface Student {
  number: string;
  name: string;
  grade: number;
  gender?: "E" | "K";
  isGhost?: boolean;
}

export interface Seat {
  salon: number;
  column: number;
  row: number;
  side: "left" | "right";
  isOuter: boolean;
  student: Student | null;
  isLocked?: boolean;
}

export interface SalonLayout {
  id: number;
  name: string;
  rows: number;
  columns: number;
}

export interface AssignmentRules {
  avoidSameGradeBehind: boolean;
  avoidMixedGenderSideBySide: boolean;
  avoidSameGradeSideBySide: boolean;
  avoidSameGradeDiagonally: boolean;
  enforceInnerOuterRule: boolean;
  enforceGrade8VerticalRule: boolean;
  avoidTopGradeDiagonally: boolean;
}

export interface StudentConstraint {
  type: "avoidTogether";
  studentNames: string[];
}

export interface AssignSeatsOptions {
  maxRetries?: number;
  rules?: Partial<AssignmentRules>;
  salons?: SalonLayout[];
  studentConstraints?: StudentConstraint[];
  lockedSeats?: Seat[];
}

export interface AssignmentResult {
  seats: Seat[];
  unassigned: Student[];
  qualityScore: number;
  deadlockResolved: boolean;
}
