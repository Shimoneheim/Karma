import type { SalonLayout } from "./seatingAlgorithm";

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
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}

export function loadTemplates(): SalonTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteTemplate(id: string): void {
  const templates = loadTemplates().filter(t => t.id !== id);
  localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
}

export function clearAllTemplates(): void {
  localStorage.removeItem(TEMPLATES_STORAGE_KEY);
}
