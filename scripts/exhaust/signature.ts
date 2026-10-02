/** Стабильная сигнатура интерактивного элемента для подсчёта покрытия. */
export type SigInput = Readonly<{
  route: string;
  dialog: string;
  role: string;
  path: string;
}>;

export const dialogOf = (path: string) => /dialog#([a-zA-Z0-9-]+)/.exec(path)?.at(1) ?? '-';

/**
 * Идентичность элемента — позиция в дереве: маршрут, диалог, роль и путь
 * с индексами nth-of-type. Видимое имя в ключ не входит: оно локализовано,
 * и клик в одном языке не покрывал вариант в другом — покрытие флапало.
 */
export const elementSignature = (input: SigInput) =>
  [input.route, input.dialog, input.role, input.path]
    .map((part) => part.replaceAll('|', '/'))
    .join('|');
