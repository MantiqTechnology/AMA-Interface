const seedDatePattern = /^\d{4}-\d{2}-\d{2}$/u;
const defaultDemoAnchorDate = '2026-07-07';

export type DemoSeedContext = {
  anchorDate: string;
  now: string;
  date: (offsetDays: number) => string;
  at: (offsetDays: number, localTime: string) => string;
  compactDate: (offsetDays: number) => string;
};

function addDays(anchorDate: string, offsetDays: number) {
  const [year, month, day] = anchorDate.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! + offsetDays)).toISOString().slice(0, 10);
}

export function createDemoSeedContext(anchorDate = process.env.DEMO_SEED_DATE) {
  // The existing demo scenarios are anchored to this date. An environment
  // override can roll the whole scenario forward once every seeder consumes
  // this context, without allowing wall-clock time to make demo data expire.
  const resolvedAnchor = anchorDate || defaultDemoAnchorDate;
  if (!seedDatePattern.test(resolvedAnchor) || addDays(resolvedAnchor, 0) !== resolvedAnchor) {
    throw new Error(`DEMO_SEED_DATE must be a valid YYYY-MM-DD date, received ${resolvedAnchor}`);
  }
  const date = (offsetDays: number) => addDays(resolvedAnchor, offsetDays);
  const at = (offsetDays: number, localTime: string) =>
    `${date(offsetDays)}T${localTime}:00.000+09:00`;
  return {
    anchorDate: resolvedAnchor,
    now: at(0, '09:00'),
    date,
    at,
    compactDate: (offsetDays: number) => date(offsetDays).replaceAll('-', '')
  } satisfies DemoSeedContext;
}
