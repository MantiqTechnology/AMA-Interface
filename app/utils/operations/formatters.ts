const jayapuraFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Jayapura'
});

export function formatJayapuraDateTime(value: string | null | undefined) {
  if (!value) return '-';
  return jayapuraFormatter.format(new Date(value));
}

export function formatRouteCode(originCode: string, destinationCode: string) {
  return `${originCode} -> ${destinationCode}`;
}

export function titleCaseStatus(value: string) {
  return value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function minutesLabel(value: number) {
  return `${value} min`;
}

export function nowDemoIso() {
  return new Date().toISOString();
}
