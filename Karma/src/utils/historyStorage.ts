import type { SalonLayout, Seat, Student } from "./seatingAlgorithm";

const HISTORY_STORAGE_KEY = "karma-history-v1";
const DRAFT_STORAGE_KEY = "karma-draft-v1";
const MAX_HISTORY_ITEMS = 20;

export interface SeatingHistoryItem {
  id: string;
  createdAt: string;
  rawInput: string;
  seats: Seat[];
  unassigned: Student[];
  salons?: SalonLayout[];
  qualityScore?: number;
  deadlockResolved?: boolean;
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function loadHistory(): SeatingHistoryItem[] {
  if (typeof window === "undefined") return [];
  return safeParse<SeatingHistoryItem[]>(
    localStorage.getItem(HISTORY_STORAGE_KEY),
    []
  );
}

export function addHistoryEntry(
  rawInput: string,
  seats: Seat[],
  unassigned: Student[],
  salons?: SalonLayout[],
  qualityScore?: number,
  deadlockResolved?: boolean
): SeatingHistoryItem[] {
  const history = loadHistory();
  const createdAt = new Date().toISOString();
  const id = `${createdAt}-${Math.random().toString(36).slice(2, 8)}`;
  const entry: SeatingHistoryItem = {
    id,
    createdAt,
    rawInput,
    seats,
    unassigned,
    salons,
    qualityScore,
    deadlockResolved,
  };

  const nextHistory = [entry, ...history].slice(0, MAX_HISTORY_ITEMS);
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
  return nextHistory;
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_STORAGE_KEY);
}

export function loadDraftInput(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(DRAFT_STORAGE_KEY) ?? "";
}

export function saveDraftInput(value: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DRAFT_STORAGE_KEY, value);
}
