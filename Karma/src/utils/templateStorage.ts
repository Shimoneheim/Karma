import type { SalonLayout } from "./seatingAlgorithm";
import {
  safeGetItem,
  safeJsonParse,
  safeRemoveItem,
  safeSetItem,
  sanitizeTemplates,
} from "./dataSanitizers";

const TEMPLATES_STORAGE_KEY = "karma-salon-templates-v1";

export interface SalonTemplate {
  id: string;
  name: string;
  salons: SalonLayout[];
}

export function saveTemplate(name: string, salons: SalonLayout[]): void {
  const templates = loadTemplates();
  templates.push({
    id: crypto.randomUUID(),
    name,
    salons: salons.map(s => ({ ...s }))
  });
  replaceTemplates(templates);
}

export function loadTemplates(): SalonTemplate[] {
  return sanitizeTemplates(safeJsonParse(safeGetItem(TEMPLATES_STORAGE_KEY)));
}

/** Overwrites all stored templates (used by backup import). Returns what was stored. */
export function replaceTemplates(templates: unknown): SalonTemplate[] {
  const sanitized = sanitizeTemplates(templates);
  safeSetItem(TEMPLATES_STORAGE_KEY, JSON.stringify(sanitized));
  return sanitized;
}

export function deleteTemplate(id: string): void {
  const templates = loadTemplates().filter(t => t.id !== id);
  replaceTemplates(templates);
}

export function clearAllTemplates(): void {
  safeRemoveItem(TEMPLATES_STORAGE_KEY);
}
