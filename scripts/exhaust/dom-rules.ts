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
 * сумму, поэтому остаются видимыми при скрытии значений. Маленькие шаблоны
 * применяются по очереди: одна большая альтернатива ловится как небезопасная.
 * Граница слова для кириллицы проверяется lookahead'ом: `\b` не работает
 * с не-ASCII буквами даже под флагом `u`.
 */
export const notAmount: readonly RegExp[] = [
  /\d{1,2}\s+[а-яёa-z]{3,9}\.?,?\s*(?:19|20)\d{2}\b/g,
  /\d{1,2},?\s+(?:19|20)\d{2}\b/g,
  /\b(?:19|20)\d{2}\b/g,
  /\d{1,4}[-./:]\d{1,2}/g,
  /\d+\s*\/\s*\d+/g,
  /\d+\s*(?:из|of)\s*\d+/g,
  /\d+\s*(?:%|шт\.?\b|pcs\b|items?\b|строк[аи]?\b|rows?\b)/g,
  // Фразы-счётчики статусов («2 готовы · 1 ошибка · 1 повтор», «2 ready · 1 error»):
  // число + служебное слово — количество строк импорта, не сумма.
  /\d+\s*(?:готов\p{L}*|ошибк\p{L}*|повтор\p{L}*|исключен\p{L}*|пропущен\p{L}*|ready|errors?|duplicates?|excluded|skipped)(?![\p{L}\p{N}])/gu,
];

/** Текст без не-денежных чисел: остаток проверяется на голые цифры. */
export const stripNotAmount = (text: string): string =>
  notAmount.reduce((rest, pattern) => rest.replace(pattern, ''), text);

/**
 * Утечка суммы в скрытом состоянии: либо текст похож на сумму (amountLike —
 * десятичные, группы тысяч, цифры рядом со знаком или кодом валюты), либо в
 * денежном слоте (класс с amount/money или именованный слот у элемента или
 * предка — moneySelectors в page-checks.ts) осталась голая цифра — целая сумма
 * без разделителей тоже раскрывает значение. Голые цифры вне денежного слота
 * не считаются: курс, дата и счётчик легально видимы.
 */
export const amountLeak = (text: string, moneySlot: boolean): boolean =>
  amountLike(text) || (moneySlot && /\d/.test(stripNotAmount(text)));

/**
 * Решение по стеку elementsFromPoint: контрол закрывает текст, только если
 * над текстом в стеке лежит непрозрачный элемент, принадлежащий контролу.
 * Пустой стек — пересечение вне вьюпорта — сюда не доходит: caller сам решает.
 */
export const stackCoversText = (
  stack: readonly Readonly<{ control: boolean; text: boolean; opaque: boolean }>[],
): boolean => {
  const textIndex = stack.findIndex((entry) => entry.text);
  const above = textIndex === -1 ? stack : stack.slice(0, textIndex);
  return above.some((entry) => entry.control && entry.opaque);
};

/** Кликабельность шага блуждания: элемент есть, виден и не за модальным диалогом. */
export const clickableNow = (
  exists: boolean,
  visible: boolean,
  dialogOpen: boolean,
  insideDialog: boolean,
): boolean => exists && visible && (!dialogOpen || insideDialog);

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
 * навигационной панелью (.mobile-links) проходит под ней при прокрутке — это
 * устройство раскладки, а не дефект. Открытое всплывающее меню (.more-menu)
 * исключением не считается: оно непрозрачно и закрывает контент намеренно.
 * Закреплённый подвал диалога (.form-actions/.dialog-actions) тоже исключён:
 * он закрывает прокручиваемое содержимое намеренно, а фокус полей выводит их
 * из-под него через --dialog-footer-reserve. Плавающая плашка .status-message
 * — такое же устройство, пока нижний отступ .workspace покрывает её след во
 * вьюпорте (caller проверяет отступ по факту): перекрытый текст уходит
 * прокруткой выше её верхнего края. Текст другого закреплённого слоя
 * (навигация, диалог) плашке не прощается. Любой другой fixed/sticky слой,
 * реально закрывающий текст, остаётся находкой.
 */
export const overlapExempt = (
  controlFixed: boolean,
  textFixed: boolean,
  controlInBottomNav: boolean,
  controlInStickyDialogFooter = false,
  controlInPaddedToast = false,
): boolean =>
  controlInStickyDialogFooter ||
  (controlFixed !== textFixed && (controlInBottomNav || controlInPaddedToast));
