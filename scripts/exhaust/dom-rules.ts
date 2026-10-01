/** Чистые проверки для страничных eval-скриптов: встраиваются через Function#toString. */

/**
 * Похож ли текст на незамаскированную сумму: знак валюты рядом с цифрой,
 * дробная часть через точку/запятую, группы тысяч или буквенный код валюты.
 * Даты («2026-09-02», «30 сент. 2026 г.»), номера строк и прочие числа не считаются суммой.
 * Разделители Intl.NumberFormat (nbsp, narrow nbsp, thin space) включены в класс GAP.
 */
export const amountLike = (text: string): boolean => {
  const GAP = ' \\u00a0\\u202f\\u2009';
  return new RegExp(
    `[₽$€£¥₸₼]\\s*\\d|\\d\\s*[₽$€£¥₸₼]|\\d[\\d${GAP}]*[.,]\\d{1,2}(?![.,:])` +
      `|(?:^|\\s)\\d{1,3}(?:[${GAP}]\\d{3})+(?![\\d${GAP}])|\\d\\s?[A-ZА-ЯЁ]{2,4}\\b`,
  ).test(text);
};

/**
 * Центр видимой части прямоугольника: пересечение рамки с вьюпортом.
 * У огромных контейнеров вроде main геометрический центр может уходить за экран или
 * под липкую панель — проверять нужно видимую часть, иначе ложные срабатывания.
 */
export const visiblePoint = (
  left: number,
  top: number,
  right: number,
  bottom: number,
  width: number,
  height: number,
): readonly [number, number] | null => {
  const x1 = Math.max(left, 0);
  const y1 = Math.max(top, 0);
  const x2 = Math.min(right, width);
  const y2 = Math.min(bottom, height);
  return x2 > x1 && y2 > y1 ? [(x1 + x2) / 2, (y1 + y2) / 2] : null;
};

/**
 * Максимальный разброс вертикальных центров соседей внутри одной визуальной строки.
 * Потомки группируются в строки по пересечению вертикальных диапазонов: перенесённые
 * на новую строку элементы (flex-wrap) не сравниваются между собой.
 */
export const lineDeltaMax = (ranges: readonly (readonly [number, number])[]): number => {
  const clusters = [...ranges]
    .toSorted((a, b) => a[0] - b[0])
    .reduce<readonly { bottom: number; centers: readonly number[] }[]>((acc, [top, bottom]) => {
      const last = acc.at(-1);
      if (last && top < last.bottom - 1)
        return [
          ...acc.slice(0, -1),
          { bottom: Math.max(last.bottom, bottom), centers: [...last.centers, (top + bottom) / 2] },
        ];
      return [...acc, { bottom, centers: [(top + bottom) / 2] }];
    }, []);
  return Math.max(0, ...clusters.map((c) => Math.max(...c.centers) - Math.min(...c.centers)));
};

/**
 * Рисует ли элемент непрозрачную краску: фон с альфой, рамка с толщиной или фоновая
 * картинка. Прозрачный слой клика (как .history-row-open::after) текста не закрывает.
 */
export const paintsBox = (
  backgroundAlpha: number,
  borderWidth: number,
  borderAlpha: number,
  hasImage: boolean,
): boolean => backgroundAlpha > 0.05 || (borderWidth > 0 && borderAlpha > 0.05) || hasImage;
