function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function validExportStart(start: string) {
  return validDate(start) && start <= '2026-09-30';
}

export function validExportEnd(start: string, end: string) {
  return validDate(end) && end <= '2026-09-30' && (!validDate(start) || start <= end);
}

export function validExportDates(start: string, end: string) {
  return validExportStart(start) && validExportEnd(start, end);
}
