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
 * Не-денежные числа внутри денежного слота: годы и даты, время, счётчики
 * «N из M», доли в процентах и разряды вида «3/7». Год и дата не раскрывают
 * сумму, поэтому остаются видимыми при скрытии значений.
 */
export const notAmount =
  /\b(?:19|20)\d{2}\b|\d{1,2},?\s*(?=(?:19|20)\d{2}\b)|\d{1,2}\s+[а-яёa-z]{3,9}\.?,?(?=\s*(?:19|20)\d{2})|\d{1,4}[-./:]\d{1,2}|\d+\s*\/\s*\d+|\d+\s*(?:из|of)\s*\d+|\d+\s*(?:%|шт\.?\b|pcs\b|items?\b|строк[аи]?\b|rows?\b)/g;

/**
 * Утечка суммы в скрытом состоянии: либо текст похож на сумму (amountLike —
 * десятичные, группы тысяч, цифры рядом со знаком или кодом валюты), либо в
 * денежном слоте (класс с amount/money у элемента или предка) осталась голая
 * цифра — целая сумма без разделителей тоже раскрывает значение. Голые цифры
 * вне денежного слота не считаются: курс, дата и счётчик легально видимы.
 */
export const amountLeak = (text: string, moneySlot: boolean): boolean =>
  amountLike(text) || (moneySlot && /\d/.test(text.replace(notAmount, '')));

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

/**
 * Исключение overlap для разнесённых по слоям пар: потоковый текст под нижней
 * навигационной панелью (.mobile-links и её всплывающее .more-menu) проходит под
 * ней при прокрутке — это устройство раскладки, а не дефект. Любой другой
 * fixed/sticky слой, реально закрывающий текст, остаётся находкой.
 */
export const overlapExempt = (
  controlFixed: boolean,
  textFixed: boolean,
  controlInBottomNav: boolean,
): boolean => controlFixed !== textFixed && controlInBottomNav;
