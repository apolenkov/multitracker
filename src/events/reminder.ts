export function validReminder(value: string) {
  const minutes = Number(value);
  return /^\d+$/.test(value) && Number.isInteger(minutes) && minutes >= 1 && minutes <= 10080;
}
