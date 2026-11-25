export function getHoursInRange(start: string | null | undefined, end: string | null | undefined): string[] {
  const hours: string[] = [];
  if (!start || !end) return hours;
  const s = Number.parseInt(start.split(':')[0], 10);
  const e = Number.parseInt(end.split(':')[0], 10);
  for (let i = s; i < e; i++) {
    hours.push(`${i.toString().padStart(2, '0')}:00`);
  }
  return hours;
}
