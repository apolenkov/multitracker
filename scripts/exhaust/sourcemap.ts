/** Минимальный декодер source map v3: VLQ-сегменты и сопоставление позиций. */
import { isRecord } from './guards.ts';
const digits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const decodeChar = (char: string) => Math.max(0, digits.indexOf(char));

export type Span = Readonly<{
  column: number;
  source: number;
  line: number;
  offset: number;
}>;
export type SourceMap = Readonly<{
  sources: readonly string[];
  lines: readonly (readonly Span[])[];
}>;

const vlq = (text: string, at: number): Readonly<{ value: number; used: number }> => {
  const digit = decodeChar(text.at(at) ?? '');
  if (!(digit & 32)) return { value: digit & 31, used: 1 };
  const rest = vlq(text, at + 1);
  return { value: (digit & 31) + (rest.value << 5), used: rest.used + 1 };
};

const vlqValue = (raw: number) => (raw & 1 ? -(raw >> 1) : raw >> 1);

type Carry = Readonly<{ src: number; sl: number }>;
type Fields = Readonly<{ at: number; values: readonly number[] }>;

const decodeFields = (segment: string): Fields =>
  [0, 1, 2, 3].reduce<Fields>(
    (acc) => {
      const decoded = vlq(segment, acc.at);
      return { at: acc.at + decoded.used, values: [...acc.values, vlqValue(decoded.value)] };
    },
    { at: 0, values: [] },
  );

const decodeSegment = (
  segment: string,
  column: number,
  carry: Carry,
): Readonly<{ column: number; src: number; sl: number; span: Span }> => {
  const fields = decodeFields(segment);
  const nextColumn = column + (fields.values.at(0) ?? 0);
  const span =
    fields.values.length < 4
      ? { column: nextColumn, source: -1, line: -1, offset: 0 }
      : {
          column: nextColumn,
          source: carry.src + (fields.values.at(1) ?? 0),
          line: carry.sl + (fields.values.at(2) ?? 0),
          offset: 0,
        };
  return {
    column: nextColumn,
    src: span.source < 0 ? carry.src : span.source,
    sl: span.line < 0 ? carry.sl : span.line,
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
        };
      },
      { spans: [], column: 0, src: carry.src, sl: carry.sl },
    );

type Lines = Readonly<{ lines: readonly (readonly Span[])[]; src: number; sl: number }>;

export const decodeMappings = (mappings: string): readonly (readonly Span[])[] =>
  mappings.split(';').reduce<Lines>(
    (acc, line) => {
      const decoded = decodeLine(line, acc);
      return { lines: [...acc.lines, decoded.spans], src: decoded.src, sl: decoded.sl };
    },
    { lines: [], src: 0, sl: 0 },
  ).lines;

export const parseMap = (json: unknown): SourceMap | null => {
  if (!isRecord(json)) return null;
  if (!Array.isArray(json.sources) || typeof json.mappings !== 'string') return null;
  return {
    sources: json.sources.map((entry) => (typeof entry === 'string' ? entry : '')),
    lines: decodeMappings(json.mappings),
  };
};

/** Позиция в исходнике по строке/колонке собранного кода (0-индексация входа). */
export const mapPosition = (
  map: SourceMap,
  line: number,
  column: number,
): Readonly<{ source: string; line: number } | null> => {
  const spans = map.lines.at(line) ?? [];
  const hit = spans.reduce<Span | null>(
    (best, span) => (span.column <= column ? span : best),
    null,
  );
  if (hit === null || hit.source < 0) return null;
  const source = map.sources.at(hit.source);
  return source === undefined ? null : { source, line: hit.line + 1 };
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
