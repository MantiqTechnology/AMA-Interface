import type Database from 'better-sqlite3';
import { getApplicationNow } from '../../../utils/time';

export type Row = Record<string, unknown>;
export const now = getApplicationNow;

export const str = (v: unknown) => (v === null || v === undefined ? null : String(v));
export const num = (v: unknown) => Number(v ?? 0);
export const bool = (v: unknown) => Boolean(v);

// Helper PPh 21 TER (Tarif Efektif Rata-rata 2024)
export function calculatePph21Ter(monthlyGross: number, ptkpStatus = 'TK/0'): number {
  if (monthlyGross <= 5400000) return 0;

  let rate = 0;
  if (
    ptkpStatus.startsWith('TK/0') ||
    ptkpStatus.startsWith('TK/1') ||
    ptkpStatus.startsWith('K/0')
  ) {
    if (monthlyGross <= 5400000) rate = 0;
    else if (monthlyGross <= 5650000) rate = 0.0025;
    else if (monthlyGross <= 5950000) rate = 0.005;
    else if (monthlyGross <= 6300000) rate = 0.0075;
    else if (monthlyGross <= 6750000) rate = 0.01;
    else if (monthlyGross <= 7500000) rate = 0.015;
    else if (monthlyGross <= 8550000) rate = 0.02;
    else if (monthlyGross <= 9650000) rate = 0.03;
    else if (monthlyGross <= 10050000) rate = 0.04;
    else if (monthlyGross <= 10350000) rate = 0.05;
    else if (monthlyGross <= 10700000) rate = 0.06;
    else if (monthlyGross <= 12500000) rate = 0.07;
    else if (monthlyGross <= 13750000) rate = 0.08;
    else if (monthlyGross <= 15100000) rate = 0.09;
    else if (monthlyGross <= 16950000) rate = 0.1;
    else if (monthlyGross <= 19750000) rate = 0.11;
    else if (monthlyGross <= 24150000) rate = 0.12;
    else if (monthlyGross <= 26450000) rate = 0.13;
    else if (monthlyGross <= 28000000) rate = 0.14;
    else if (monthlyGross <= 30000000) rate = 0.15;
    else if (monthlyGross <= 33000000) rate = 0.17;
    else if (monthlyGross <= 36000000) rate = 0.19;
    else if (monthlyGross <= 40000000) rate = 0.21;
    else if (monthlyGross <= 50000000) rate = 0.24;
    else rate = 0.26;
  } else {
    if (monthlyGross <= 6200000) rate = 0;
    else if (monthlyGross <= 10000000) rate = 0.03;
    else if (monthlyGross <= 20000000) rate = 0.1;
    else if (monthlyGross <= 35000000) rate = 0.18;
    else rate = 0.25;
  }

  return Math.round(monthlyGross * rate);
}

export function generateNextNumber(
  sqlite: Database.Database,
  type: string,
  prefix: string
): string {
  const currentYear = new Date().getFullYear();
  const yearSuffix = String(currentYear).slice(2);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS number_sequences (
      sequence_type TEXT PRIMARY KEY,
      last_number INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    )
  `);

  const row = sqlite
    .prepare('SELECT last_number FROM number_sequences WHERE sequence_type = ?')
    .get(type) as Row | undefined;

  let nextNum = 1;
  if (row) {
    nextNum = Number(row.last_number) + 1;
    sqlite
      .prepare(
        'UPDATE number_sequences SET last_number = ?, updated_at = ? WHERE sequence_type = ?'
      )
      .run(nextNum, now(), type);
  } else {
    sqlite
      .prepare(
        'INSERT INTO number_sequences (sequence_type, last_number, updated_at) VALUES (?, ?, ?)'
      )
      .run(type, nextNum, now());
  }

  return `${prefix}-${yearSuffix}-${String(nextNum).padStart(5, '0')}`;
}
