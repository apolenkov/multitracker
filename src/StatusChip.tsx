import { Icon } from './Icon.tsx';

/** Статус-чип: значок и слово — состояние читается не одним цветом. */
export function StatusChip({
  tone,
  label,
}: Readonly<{ tone: 'ok' | 'warn' | 'error'; label: string }>) {
  return (
    <span className={`status-chip status-chip-${tone}`}>
      <Icon name={tone === 'ok' ? 'check' : 'warning'} />
      {label}
    </span>
  );
}
