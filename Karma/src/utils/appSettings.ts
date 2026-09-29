import {
  defaultAssignmentRules,
  defaultSalons,
  type AssignmentRules,
  type SalonLayout,
} from "./seatingAlgorithm";
import { defaultPdfSettings, type PdfSettings } from "./pdfSettings";
import {
  safeGetItem,
  safeJsonParse,
  safeSetItem,
  sanitizePdfSettings,
  sanitizeRules,
  sanitizeSalons,
} from "./dataSanitizers";

const APP_SETTINGS_STORAGE_KEY = "karma-settings-v1";
const MAX_CONSTRAINTS_LENGTH = 20_000;

export interface AppSettings {
  pdf: PdfSettings;
  algorithm: AssignmentRules;
  salons: SalonLayout[];
  behavioralConstraints?: string;
}

function defaultAppSettings(): AppSettings {
  return {
    pdf: { ...defaultPdfSettings },
    algorithm: { ...defaultAssignmentRules },
    salons: defaultSalons.map((salon) => ({ ...salon })),
    behavioralConstraints: "",
  };
}

/** Rebuilds settings from untrusted input (localStorage or an imported backup). */
export function sanitizeAppSettings(value: unknown): AppSettings {
  const parsed =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const salons = sanitizeSalons(parsed.salons);

  return {
    pdf: {
      ...sanitizePdfSettings(parsed.pdf, defaultPdfSettings),
      examDate: defaultPdfSettings.examDate, // Always force today's date on load
    },
    algorithm: sanitizeRules(parsed.algorithm),
    salons:
      salons.length > 0
        ? salons
        : defaultSalons.map((salon) => ({ ...salon })),
    behavioralConstraints:
      typeof parsed.behavioralConstraints === "string"
        ? parsed.behavioralConstraints.slice(0, MAX_CONSTRAINTS_LENGTH)
        : "",
  };
}

export function loadAppSettings(): AppSettings {
  if (typeof window === "undefined") return defaultAppSettings();
  return sanitizeAppSettings(
    safeJsonParse(safeGetItem(APP_SETTINGS_STORAGE_KEY)),
  );
}

export function saveAppSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  safeSetItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
