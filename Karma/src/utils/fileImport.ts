import * as XLSX from 'xlsx';

function normalizeLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  // Security Fix: Prevent ReDoS on extremely long lines
  if (trimmed.length > 300) return null;

  const parenthesized = trimmed.match(/^(\S+)\s+(.+?)\s+\((\d+)\)$/);
  if (parenthesized) {
    return `${parenthesized[1]} ${parenthesized[2]} ${parenthesized[3]}`;
  }

  if (!/[,\t;]/.test(trimmed)) {
    return trimmed;
  }

  const parts = trimmed
    .split(/[,\t;]/)
    .map((part) => part.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);

  if (parts.length < 3) {
    return trimmed;
  }

  const grade = parts[parts.length - 1].replace(/[()]/g, '');
  const number = parts[0];
  const name = parts.slice(1, -1).join(' ');

  if (!number || !name || !/^\d+$/.test(grade)) {
    return trimmed;
  }

  return `${number} ${name} ${grade}`;
}

function normalizeInput(raw: string): string {
  return raw
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

function toLineFromSheetRow(row: unknown[]): string | null {
  const cells = row
    .map((cell) => String(cell ?? '').trim())
    .filter((cell) => cell.length > 0);

  if (cells.length === 0) return null;
  if (cells.length === 1) return normalizeLine(cells[0]);

  const headerLike = cells.join(' ').toLocaleLowerCase('tr-TR');
  if (
    headerLike.includes('numara') ||
    headerLike.includes('sınıf') ||
    headerLike.includes('sinif')
  ) {
    return null;
  }

  const number = cells[0];
  const grade = cells[cells.length - 1].replace(/[()]/g, '');
  const name = cells.slice(1, -1).join(' ');

  if (!number || !name || !/^\d+$/.test(grade)) {
    return normalizeLine(cells.join(' '));
  }

  return `${number} ${name} ${grade}`;
}

function parseSpreadsheet(content: ArrayBuffer): string {
  const workbook = XLSX.read(content, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return '';

  const firstSheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
    header: 1,
    raw: false,
    defval: '',
  });

  return rows
    .map((row) => toLineFromSheetRow(row))
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

export async function readStudentFile(file: File): Promise<string> {
  const lowerName = file.name.toLocaleLowerCase('tr-TR');

  if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    const content = await file.arrayBuffer();
    return normalizeInput(parseSpreadsheet(content));
  }

  const raw = await file.text();
  return normalizeInput(raw);
}
