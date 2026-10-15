/** Минимальный декодер source map v3: VLQ-сегменты и сопоставление позиций. */
import { isRecord } from './guards.ts';
const digits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const decodeChar = (char: string) => Math.max(0, digits.indexOf(char));

export type Span = Readonly<{
  column: number;
  source: number;
  line: number;
  srcColumn: number;
  /** Индекс в names карты (исходное имя токена) или -1. */
  name: number;
  offset: number;
}>;
export type SourceMap = Readonly<{
  sources: readonly string[];
  names: readonly string[];
  lines: readonly (readonly Span[])[];
}>;

const vlq = (text: string, at: number): Readonly<{ value: number; used: number }> => {
  const digit = decodeChar(text.at(at) ?? '');
  if (!(digit & 32)) return { value: digit & 31, used: 1 };
  const rest = vlq(text, at + 1);
  return { value: (digit & 31) + (rest.value << 5), used: rest.used + 1 };
};

const vlqValue = (raw: number) => (raw & 1 ? -(raw >> 1) : raw >> 1);

type Carry = Readonly<{ src: number; sl: number; sc: number; nm: number }>;
type Fields = Readonly<{ at: number; values: readonly number[] }>;

const decodeFields = (segment: string): Fields =>
  [0, 1, 2, 3, 4].reduce<Fields>(
    (acc, index) => {
      // Пятое поле (имя) есть только в длинных сегментах.
      if (index === 4 && acc.at >= segment.length) return acc;
      const decoded = vlq(segment, acc.at);
      return { at: acc.at + decoded.used, values: [...acc.values, vlqValue(decoded.value)] };
    },
    { at: 0, values: [] },
  );

const spanOf = (values: readonly number[], column: number, carry: Carry): Span => {
  const [, source = 0, line = 0, srcColumn = 0, name] = values;
  return {
    column,
    source: carry.src + source,
    line: carry.sl + line,
    srcColumn: carry.sc + srcColumn,
    name: name === undefined ? -1 : carry.nm + name,
    offset: 0,
  };
};

const decodeSegment = (
  segment: string,
  column: number,
  carry: Carry,
): Readonly<{ column: number; src: number; sl: number; sc: number; nm: number; span: Span }> => {
  const { values } = decodeFields(segment);
  const nextColumn = column + (values.at(0) ?? 0);
  // Сегмент без источника (меньше 4 полей) карту не двигает.
  const mapped = values.length >= 4;
  const span: Span = mapped
    ? spanOf(values, nextColumn, carry)
    : { column: nextColumn, source: -1, line: -1, srcColumn: -1, name: -1, offset: 0 };
  return {
    column: nextColumn,
    src: mapped ? span.source : carry.src,
    sl: mapped ? span.line : carry.sl,
    sc: mapped ? span.srcColumn : carry.sc,
    nm: span.name < 0 ? carry.nm : span.name,
    span,
  };
};

const decodeLine = (line: string, carry: Carry) =>
  line
    .split(',')
    .filter(Boolean)
    .reduce<Readonly<{ spans: readonly Span[]; column: number } & Carry>>(
      (acc, segment) => {
        const decoded = decodeSegment(segment, acc.column, acc);
        return {
          spans: [...acc.spans, decoded.span],
          column: decoded.column,
          src: decoded.src,
          sl: decoded.sl,
          sc: decoded.sc,
          nm: decoded.nm,
        };
      },
      { spans: [], column: 0, src: carry.src, sl: carry.sl, sc: carry.sc, nm: carry.nm },
    );

type Lines = Readonly<{
  lines: readonly (readonly Span[])[];
  src: number;
  sl: number;
  sc: number;
  nm: number;
}>;

export const decodeMappings = (mappings: string): readonly (readonly Span[])[] =>
  mappings.split(';').reduce<Lines>(
    (acc, line) => {
      const decoded = decodeLine(line, acc);
      return {
        lines: [...acc.lines, decoded.spans],
        src: decoded.src,
        sl: decoded.sl,
        sc: decoded.sc,
        nm: decoded.nm,
      };
    },
    { lines: [], src: 0, sl: 0, sc: 0, nm: 0 },
  ).lines;

export const parseMap = (json: unknown): SourceMap | null => {
  if (!isRecord(json)) return null;
  if (!Array.isArray(json.sources) || typeof json.mappings !== 'string') return null;
  return {
    sources: json.sources.map((entry) => (typeof entry === 'string' ? entry : '')),
    names: Array.isArray(json.names)
      ? json.names.map((entry) => (typeof entry === 'string' ? entry : ''))
      : [],
    lines: decodeMappings(json.mappings),
  };
};

/** Позиция в исходнике по строке/колонке собранного кода (0-индексация входа). */
export const mapPosition = (
  map: SourceMap,
  line: number,
  column: number,
): Readonly<{ source: string; line: number; column: number } | null> => {
  const spans = map.lines.at(line) ?? [];
  const hit = spans.reduce<Span | null>(
    (best, span) => (span.column <= column ? span : best),
    null,
  );
  if (hit === null || hit.source < 0) return null;
  const source = map.sources.at(hit.source);
  return source === undefined ? null : { source, line: hit.line + 1, column: hit.srcColumn };
};

export const lineStartOffsets = (text: string): readonly number[] =>
  [...text.matchAll(/\n/g)].reduce<readonly number[]>(
    (acc, match) => [...acc, match.index + 1],
    [0],
  );

/** Позиция (строка, колонка, 0-индексация) по готовым началам строк: без повторного сканирования. */
export const offsetAt = (starts: readonly number[], offset: number) => {
  const line = starts.reduce((best, at, index) => (at <= offset ? index : best), 0);
  return { line, column: offset - (starts.at(line) ?? 0) };
};

/** Позиция (строка, колонка, 0-индексация) смещения в единицах UTF-16. */
export const positionOf = (text: string, offset: number) =>
  offsetAt(lineStartOffsets(text), offset);
