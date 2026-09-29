import type { SalonLayout, Seat, Student } from "./seatingAlgorithm";
import {
  MAX_HISTORY_ITEMS,
  safeGetItem,
  safeJsonParse,
  safeRemoveItem,
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
  return sanitizeHistory(safeJsonParse(safeGetItem(HISTORY_STORAGE_KEY)));
}

/**
 * Persists history, dropping the oldest entries if the browser storage quota
 * is exceeded so a large plan never makes saving fail outright.
 * Returns what was stored, or null if not even the newest entry fit; in that
 * case the previously stored history is left untouched.
 */
function persistHistory(
  history: SeatingHistoryItem[],
): SeatingHistoryItem[] | null {
  if (history.length === 0) {
    safeRemoveItem(HISTORY_STORAGE_KEY);
    return [];
  }
  let items = history.slice(0, MAX_HISTORY_ITEMS);
  while (items.length > 0) {
    if (safeSetItem(HISTORY_STORAGE_KEY, JSON.stringify(items))) return items;
    items = items.slice(0, -1);
  }
  return null;
}

/** Overwrites all stored history (used by backup import). Returns what was stored, or null if storage is full. */
export function replaceHistory(history: unknown): SeatingHistoryItem[] | null {
  return persistHistory(sanitizeHistory(history));
}

export function addHistoryEntry(
  rawInput: string,
  seats: Seat[],
  unassigned: Student[],
  salons?: SalonLayout[],
  qualityScore?: number,
  deadlockResolved?: boolean
): SeatingHistoryItem[] | null {
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
  safeRemoveItem(HISTORY_STORAGE_KEY);
}

export function loadDraftInput(): string {
  if (typeof window === "undefined") return "";
  return safeGetItem(DRAFT_STORAGE_KEY) ?? "";
}

export function saveDraftInput(value: string): void {
  if (typeof window === "undefined") return;
  safeSetItem(DRAFT_STORAGE_KEY, value);
}
