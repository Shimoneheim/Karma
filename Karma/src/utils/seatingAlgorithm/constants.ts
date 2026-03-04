import type { AssignmentRules, SalonLayout } from "./types";

export const GHOST_STUDENT_GRADE = -999;
export const MAX_RETRIES_DEFAULT = 300;
export const MAX_RETRIES_LIMIT = 1000;

export const defaultAssignmentRules: AssignmentRules = {
  avoidSameGradeBehind: false,
  avoidMixedGenderSideBySide: false,
  avoidSameGradeSideBySide: false,
  avoidSameGradeDiagonally: false,
  enforceInnerOuterRule: false,
  enforceGrade8VerticalRule: false,
  avoidTopGradeDiagonally: false,
};

export const defaultSalons: SalonLayout[] = [
  { id: 1, name: "Salon 1", rows: 5, columns: 2 }, // 20 seats
  { id: 2, name: "Salon 2", rows: 4, columns: 2 }, // 16 seats
  { id: 3, name: "Salon 3", rows: 3, columns: 2 }, // 12 seats
];

export const salons = defaultSalons;
