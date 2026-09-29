import { afterEach, describe, expect, it, vi } from "vitest";
import { addHistoryEntry, loadHistory, replaceHistory } from "./historyStorage";
import type { Seat } from "./seatingAlgorithm";

const seat: Seat = {
  salon: 1,
  column: 0,
  row: 0,
  side: "left",
  isOuter: true,
  student: { number: "1", name: "Ali", grade: 5 },
};

describe("historyStorage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("saves and reloads a plan", () => {
    const saved = addHistoryEntry("Ali 5", [seat], []);
    expect(saved).toHaveLength(1);
    expect(loadHistory()[0].seats[0].student?.name).toBe("Ali");
  });

  it("keeps existing history when storage is full", () => {
    addHistoryEntry("Ali 5", [seat], []);
    const before = localStorage.getItem("karma-history-v1");

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(addHistoryEntry("Veli 6", [seat], [])).toBeNull();
    expect(replaceHistory([{ id: "x", seats: [seat] }])).toBeNull();
    expect(localStorage.getItem("karma-history-v1")).toBe(before);
  });

  it("does not throw when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(loadHistory()).toEqual([]);
  });

  it("keeps every seat of a maximum-size layout", () => {
    // 100 salons x 20 rows x 8 columns x 2 seats is the largest valid layout.
    const seats = Array.from({ length: 32_000 }, () => ({ ...seat, student: null }));
    const [item] = replaceHistory([{ id: "big", seats }]) ?? [];
    expect(item.seats).toHaveLength(32_000);
  });
});
