import { WorkspaceError } from '../errors/workspace.errors';

/** The seven SeatOS features in the Looker usage table, in its column order. WAO = how many were used (of 7). */
export const FEATURES = [
  'inventory_management',
  'distribution_management',
  'reservation_management',
  'trip_management',
  'fleet_management',
  'analytics',
  'accounting',
] as const;
export type Feature = (typeof FEATURES)[number];

export type WeeklyKind = 'usage' | 'tickets';

export interface UsageRow {
  readonly operatorName: string;
  readonly features: Readonly<Record<Feature, boolean>>;
  readonly featureCount: number;
}

export interface TicketRow {
  readonly operatorName: string;
  readonly gmvUsd: number;
  readonly tickets: number;
}

export class WeeklyDataError extends WorkspaceError {}

/** Minimal RFC 4180 reader: quoted fields, doubled quotes, CRLF, a leading BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Looker exports some names HTML-escaped ("D&#039;Camel"); this restores them and tidies spaces. */
export function cleanName(raw: string): string {
  return raw
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (m, e: string) => ENTITIES[e.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

/** The matching key: lower case, letters (with their marks) and digits only ("PhiPhi Cruiser" = "Phi Phi Cruiser"). */
export function nameKey(name: string): string {
  return cleanName(name)
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, ''); // \p{M} keeps Thai vowel and tone marks
}

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** "Oct 5, 2026" or "2026-10-05" → "2026-10-05". */
export function parseWeek(raw: string): string {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^([A-Za-z]{3})[a-z]*\.? (\d{1,2}), (\d{4})$/);
  if (!m || MONTHS[m[1].toLowerCase()] === undefined) throw new WeeklyDataError(`Unrecognised week "${raw}" (expected e.g. "Oct 5, 2026")`);
  return new Date(Date.UTC(Number(m[3]), MONTHS[m[1].toLowerCase()], Number(m[2]))).toISOString().slice(0, 10);
}

/** Monday (YYYY-MM-DD) of the week containing `date`, in the given time zone's calendar. */
export function mondayOf(date: Date, timeZone = 'Asia/Bangkok'): string {
  const local = new Date(date.toLocaleString('en-US', { timeZone }));
  const day = (local.getDay() + 6) % 7; // Monday = 0
  local.setDate(local.getDate() - day);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
}

function header(rows: string[][], required: string[], file: string): Map<string, number> {
  if (!rows.length) throw new WeeklyDataError(`The ${file} file is empty`);
  const cols = new Map(rows[0].map((h, i) => [h.trim().toLowerCase(), i] as const));
  const missing = required.filter((r) => !cols.has(r.toLowerCase()));
  if (missing.length) throw new WeeklyDataError(`The ${file} file is missing column(s): ${missing.join(', ')}`);
  return cols;
}

const flag = (v: string | undefined) => v?.trim() === '1' || v?.trim().toLowerCase() === 'true';
const number = (v: string | undefined, what: string, name: string): number => {
  const n = Number((v ?? '').replace(/[,\s$]/g, ''));
  if (!Number.isFinite(n)) throw new WeeklyDataError(`${what} for "${name}" is not a number: "${v}"`);
  return n;
};

/** Looker "Usage Table" export: Week, Operator name, the 7 feature columns (1/0), # Feature count. */
export function parseUsageCsv(text: string): { weeks: string[]; rows: (UsageRow & { week: string })[] } {
  const rows = parseCsv(text);
  const cols = header(rows, ['Week', 'Operator name', ...FEATURES], 'activity');
  const countCol = [...cols.keys()].find((k) => k.includes('feature count'));
  const at = (r: string[], name: string) => r[cols.get(name.toLowerCase())!];
  const out = rows.slice(1).map((r) => {
    const operatorName = cleanName(at(r, 'Operator name') ?? '');
    if (!operatorName) throw new WeeklyDataError('A row in the activity file has no operator name');
    const features = Object.fromEntries(FEATURES.map((f) => [f, flag(at(r, f))])) as Record<Feature, boolean>;
    const used = FEATURES.filter((f) => features[f]).length;
    const featureCount = countCol ? number(r[cols.get(countCol)!], 'Feature count', operatorName) : used;
    return { week: parseWeek(at(r, 'Week') ?? ''), operatorName, features, featureCount };
  });
  return { weeks: [...new Set(out.map((r) => r.week))].sort(), rows: out };
}

/** "Budget vs Actual" export: operator_name, GMV (USD), Tickets Actual — one week, no date column. */
export function parseTicketsCsv(text: string): TicketRow[] {
  const rows = parseCsv(text);
  const cols = header(rows, ['operator_name', 'GMV', 'Tickets Actual'], 'tickets');
  const at = (r: string[], name: string) => r[cols.get(name.toLowerCase())!];
  return rows.slice(1).map((r) => {
    const operatorName = cleanName(at(r, 'operator_name') ?? '');
    if (!operatorName) throw new WeeklyDataError('A row in the tickets file has no operator name');
    return { operatorName, gmvUsd: Math.round(number(at(r, 'GMV'), 'GMV', operatorName) * 100) / 100, tickets: Math.round(number(at(r, 'Tickets Actual'), 'Tickets', operatorName)) };
  });
}
