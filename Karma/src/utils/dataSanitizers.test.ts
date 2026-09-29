import { describe, expect, it } from "vitest";
import { sanitizeAppSettings } from "./appSettings";
import { sanitizeHistory, sanitizeTemplates } from "./dataSanitizers";

describe("dataSanitizers", () => {
  it("rebuilds malformed app settings with safe defaults", () => {
    const settings = sanitizeAppSettings({
      pdf: { schoolName: 42, examName: "Deneme", logoDataUrl: "javascript:alert(1)" },
      algorithm: { enforceInnerOuterRule: "yes", avoidSameGradeBehind: true, __proto__: { polluted: true } },
      salons: "not-an-array",
      behavioralConstraints: { evil: true },
    });

    expect(settings.pdf.schoolName).toBe("");
    expect(settings.pdf.examName).toBe("Deneme");
    expect(settings.pdf.logoDataUrl).toBeNull();
    expect(settings.algorithm.enforceInnerOuterRule).toBe(false);
    expect(settings.algorithm.avoidSameGradeBehind).toBe(true);
    expect(settings.algorithm).not.toHaveProperty("polluted");
    expect(settings.salons.length).toBeGreaterThan(0);
    expect(settings.behavioralConstraints).toBe("");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("clamps salon dimensions", () => {
    const [salon] = sanitizeAppSettings({
      salons: [{ id: "x", name: "", rows: 1e9, columns: -5 }],
    }).salons;
    expect(salon).toEqual({ id: 1, name: "Salon 1", rows: 20, columns: 2 });
  });

  it("drops invalid history and template entries", () => {
    expect(sanitizeHistory("nope")).toEqual([]);
    expect(sanitizeTemplates([null, { name: "A", salons: [] }])).toEqual([]);

    const history = sanitizeHistory([
      {
        id: "1",
        createdAt: "2026-01-01",
        rawInput: "Ali 5",
        seats: [{ salon: 1, column: 0, row: 0, side: "left", isOuter: true, student: { number: "1", name: "Ali", grade: 5 } }, "junk"],
        unassigned: [{ name: "no number" }],
      },
    ]);
    expect(history).toHaveLength(1);
    expect(history[0].seats).toHaveLength(1);
    expect(history[0].seats[0].student?.name).toBe("Ali");
    expect(history[0].unassigned).toEqual([]);
  });
});
