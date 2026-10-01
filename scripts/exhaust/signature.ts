/** Стабильная сигнатура интерактивного элемента для подсчёта покрытия. */
export type SigInput = Readonly<{
  route: string;
  dialog: string;
  role: string;
  name: string;
  path: string;
}>;

export const normalizeName = (name: string) =>
  name.replace(/\s+/g, ' ').trim().toLowerCase().replace(/\d+/g, '#');

export const stripIndices = (path: string) => path.replaceAll(/:nth-of-type\(\d+\)/g, '');

export const dialogOf = (path: string) => path.match(/dialog#([a-zA-Z0-9-]+)/)?.at(1) ?? '-';

export const elementSignature = (input: SigInput) =>
  [input.route, input.dialog, input.role, normalizeName(input.name), stripIndices(input.path)]
    .map((part) => part.replaceAll('|', '/'))
    .join('|');
