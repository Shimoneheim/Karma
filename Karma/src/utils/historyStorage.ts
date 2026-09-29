import type { SalonLayout, Seat, Student } from "./seatingAlgorithm";
import {
  MAX_HISTORY_ITEMS,
  safeJsonParse,
  safeSetItem,
  sanitizeHistory,
} from "./dataSanitizers";

const HISTORY_STORAGE_KEY = "karma-history-v1";
const DRAFT_STORAGE_KEY = "karma-draft-v1";

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

export function loadHistory(): SeatingHistoryItem[] {
  if (typeof window === "undefined") return [];
  return sanitizeHistory(
    safeJsonParse(localStorage.getItem(HISTORY_STORAGE_KEY))
  );
}

/**
 * Persists history, dropping the oldest entries if the browser storage quota
 * is exceeded so a large plan never makes saving fail outright.
 */
function persistHistory(history: SeatingHistoryItem[]): SeatingHistoryItem[] {
  let items = history.slice(0, MAX_HISTORY_ITEMS);
  while (items.length > 0) {
    if (safeSetItem(HISTORY_STORAGE_KEY, JSON.stringify(items))) return items;
    items = items.slice(0, -1);
  }
  localStorage.removeItem(HISTORY_STORAGE_KEY);
  return items;
}

/** Overwrites all stored history (used by backup import). Returns what was stored. */
export function replaceHistory(history: unknown): SeatingHistoryItem[] {
  return persistHistory(sanitizeHistory(history));
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

  return persistHistory([entry, ...history]);
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
  safeSetItem(DRAFT_STORAGE_KEY, value);
}
