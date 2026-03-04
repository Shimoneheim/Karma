import {
  defaultAssignmentRules,
  defaultSalons,
  type AssignmentRules,
  type SalonLayout,
} from "./seatingAlgorithm";
import { defaultPdfSettings, type PdfSettings } from "./pdfGenerator";

const APP_SETTINGS_STORAGE_KEY = "karma-settings-v1";

export interface AppSettings {
  pdf: PdfSettings;
  algorithm: AssignmentRules;
  salons: SalonLayout[];
  behavioralConstraints?: string;
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function defaultAppSettings(): AppSettings {
  return {
    pdf: { ...defaultPdfSettings },
    algorithm: { ...defaultAssignmentRules },
    salons: defaultSalons.map((salon) => ({ ...salon })),
    behavioralConstraints: "",
  };
}

export function loadAppSettings(): AppSettings {
  if (typeof window === "undefined") return defaultAppSettings();

  const parsed = safeParse<Partial<AppSettings>>(
    localStorage.getItem(APP_SETTINGS_STORAGE_KEY),
    {}
  );

  return {
    pdf: {
      ...defaultPdfSettings,
      ...(parsed.pdf ?? {}),
      examDate: defaultPdfSettings.examDate, // Always force today's date on load
    },
    algorithm: {
      ...defaultAssignmentRules,
      ...(parsed.algorithm ?? {}),
    },
    salons:
      parsed.salons && parsed.salons.length > 0
        ? parsed.salons.map((salon) => ({ ...salon }))
        : defaultSalons.map((salon) => ({ ...salon })),
    behavioralConstraints: parsed.behavioralConstraints ?? "",
  };
}

export function saveAppSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
