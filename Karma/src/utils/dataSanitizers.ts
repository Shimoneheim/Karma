import type {
  AssignmentRules,
  SalonLayout,
  Seat,
  Student,
} from "./seatingAlgorithm";
import { defaultAssignmentRules } from "./seatingAlgorithm";
import type { PdfSettings } from "./pdfSettings";

/*
 * Everything read back from localStorage or from a user-supplied backup file is
 * untrusted: a malformed or hostile value that gets persisted would otherwise
 * crash the app on every reload. These helpers rebuild each object from
 * scratch, keeping only known fields of the expected type.
 */

const MAX_TEXT_LENGTH = 200;
const MAX_RAW_INPUT_LENGTH = 500_000;
const MAX_SALONS = 100;
const MAX_TEMPLATES = 100;
export const MAX_HISTORY_ITEMS = 20;

export const SALON_LIMITS = {
  minRows: 1,
  maxRows: 20,
  minColumns: 2,
  maxColumns: 8,
} as const;

// Largest seat list a valid layout can produce (two seats per desk), so saved plans are never truncated.
const MAX_SEATS =
  MAX_SALONS * SALON_LIMITS.maxRows * SALON_LIMITS.maxColumns * 2;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, maxLength = MAX_TEXT_LENGTH): string | null {
  return typeof value === "string" ? value.slice(0, maxLength) : null;
}

function asInteger(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.round(num)));
}

function asArray(value: unknown, maxLength: number): unknown[] {
  return Array.isArray(value) ? value.slice(0, maxLength) : [];
}

export function sanitizeRawInput(value: unknown): string {
  return asString(value, MAX_RAW_INPUT_LENGTH) ?? "";
}

export function sanitizePdfSettings(
  value: unknown,
  defaults: PdfSettings,
): PdfSettings {
  const input = isRecord(value) ? value : {};
  return {
    schoolName: asString(input.schoolName) ?? defaults.schoolName,
    examName: asString(input.examName) ?? defaults.examName,
    examDate: asString(input.examDate, 32) ?? defaults.examDate,
    logoDataUrl: null,
  };
}

export function sanitizeRules(value: unknown): AssignmentRules {
  const input = isRecord(value) ? value : {};
  const rules = { ...defaultAssignmentRules };
  for (const key of Object.keys(rules) as (keyof AssignmentRules)[]) {
    if (typeof input[key] === "boolean") rules[key] = input[key] as boolean;
  }
  return rules;
}

export function sanitizeSalons(value: unknown): SalonLayout[] {
  return asArray(value, MAX_SALONS)
    .filter(isRecord)
    .map((salon, index) => {
      const fallbackId = index + 1;
      return {
        id: asInteger(salon.id, 1, 9999, fallbackId),
        name: (asString(salon.name) ?? "").trim() || `Salon ${fallbackId}`,
        rows: asInteger(
          salon.rows,
          SALON_LIMITS.minRows,
          SALON_LIMITS.maxRows,
          4,
        ),
        columns: asInteger(
          salon.columns,
          SALON_LIMITS.minColumns,
          SALON_LIMITS.maxColumns,
          2,
        ),
      };
    });
}

function sanitizeStudent(value: unknown): Student | null {
  if (!isRecord(value)) return null;
  const number = asString(value.number, 50);
  const name = asString(value.name);
  const grade = Number(value.grade);
  if (number === null || name === null || !Number.isInteger(grade)) return null;
  return {
    number,
    name,
    grade,
    gender: value.gender === "E" || value.gender === "K" ? value.gender : undefined,
    isGhost: value.isGhost === true,
  };
}

function sanitizeStudents(value: unknown): Student[] {
  return asArray(value, MAX_SEATS)
    .map(sanitizeStudent)
    .filter((s): s is Student => s !== null);
}

function sanitizeSeats(value: unknown): Seat[] {
  return asArray(value, MAX_SEATS)
    .filter(isRecord)
    .map((seat) => ({
      salon: asInteger(seat.salon, 1, 9999, 1),
      column: asInteger(seat.column, 0, SALON_LIMITS.maxColumns - 1, 0),
      row: asInteger(seat.row, 0, SALON_LIMITS.maxRows - 1, 0),
      side: seat.side === "right" ? ("right" as const) : ("left" as const),
      isOuter: seat.isOuter === true,
      student: sanitizeStudent(seat.student),
      isLocked: seat.isLocked === true,
    }));
}

export interface SanitizedHistoryItem {
  id: string;
  createdAt: string;
  rawInput: string;
  seats: Seat[];
  unassigned: Student[];
  salons?: SalonLayout[];
  qualityScore?: number;
  deadlockResolved?: boolean;
}

export function sanitizeHistory(value: unknown): SanitizedHistoryItem[] {
  return asArray(value, MAX_HISTORY_ITEMS)
    .filter(isRecord)
    .map((item, index) => {
      const salons = sanitizeSalons(item.salons);
      const createdAt = asString(item.createdAt, 64) ?? "";
      return {
        id: asString(item.id, 100) ?? `${createdAt}-${index}`,
        createdAt,
        rawInput: sanitizeRawInput(item.rawInput),
        seats: sanitizeSeats(item.seats),
        unassigned: sanitizeStudents(item.unassigned),
        salons: salons.length > 0 ? salons : undefined,
        qualityScore:
          typeof item.qualityScore === "number" &&
          Number.isFinite(item.qualityScore)
            ? item.qualityScore
            : undefined,
        deadlockResolved: item.deadlockResolved === true,
      };
    });
}

export interface SanitizedTemplate {
  id: string;
  name: string;
  salons: SalonLayout[];
}

export function sanitizeTemplates(value: unknown): SanitizedTemplate[] {
  return asArray(value, MAX_TEMPLATES)
    .filter(isRecord)
    .map((template, index) => ({
      id: asString(template.id, 100) ?? `template-${index}`,
      name: asString(template.name) ?? `Şablon ${index + 1}`,
      salons: sanitizeSalons(template.salons),
    }))
    .filter((template) => template.salons.length > 0);
}

/** Parses JSON without throwing; returns undefined on any failure. */
export function safeJsonParse(value: string | null): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

/** localStorage writes can throw (quota exceeded, private mode); never let that crash the UI. */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`Could not save "${key}" to localStorage`, err);
    return false;
  }
}

/** Reads can throw too when storage is blocked by the browser; treat that as "nothing stored". */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage unavailable: nothing to remove.
  }
}
