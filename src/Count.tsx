/** Единый приём оформления числа: счётчики везде выглядят одинаково (бейдж .count). */
export function Count({ value }: Readonly<{ value: number }>) {
  return <span className="count">{value}</span>;
}
