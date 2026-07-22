const papuaTimeZone = 'Asia/Jayapura';
const seedDatePattern = /^\d{4}-\d{2}-\d{2}$/u;

export type DemoSeedContext = {
  anchorDate: string;
  now: string;
  date: (offsetDays: number) => string;
  at: (offsetDays: number, localTime: string) => string;
  compactDate: (offsetDays: number) => string;
};

function currentPapuaDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: papuaTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function addDays(anchorDate: string, offsetDays: number) {
  const [year, month, day] = anchorDate.split('-').map(Number);
  const value = new Date(Date.UTC(year!, month! - 1, day! + offsetDays));
  return value.toISOString().slice(0, 10);
}

export function createDemoSeedContext(anchorDate = process.env.DEMO_SEED_DATE) {
  const resolvedAnchor = anchorDate || currentPapuaDate();
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
