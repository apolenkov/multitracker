/** Чистая арифметика цвета: разбор CSS-цвета, яркость и контраст WCAG. */
export type Rgba = Readonly<{ r: number; g: number; b: number; a: number }>;

export const clamp = (value: number) => Math.min(255, Math.max(0, Math.round(value)));

export const hex = (value: string): Rgba | null => {
  const raw = value.replace('#', '');
  const full =
    raw.length === 3 || raw.length === 4
      ? [...raw].map((char) => char + char).join('')
      : raw;
  if (!/^[\da-f]{6}([\da-f]{2})?$/i.test(full)) return null;
  const channel = (at: number) => Number.parseInt(full.slice(at, at + 2), 16);
  return { r: channel(0), g: channel(2), b: channel(4), a: full.length === 8 ? channel(6) / 255 : 1 };
};

export const colorChannel = (part: string, scale: number) =>
  part.trim().endsWith('%') ? (Number.parseFloat(part) / 100) * 255 : Number.parseFloat(part) * scale;

export const rgb = (value: string): Rgba | null => {
  const match = value.match(/^rgba?\(\s*([^)]*?)\s*\)$/i);
  const parts = match?.at(1)?.split(/[\s,/]+/).filter(Boolean) ?? [];
  if (!match || parts.length < 3) return null;
  const alpha = parts.at(3);
  return {
    r: clamp(colorChannel(parts.at(0) ?? '0', 1)),
    g: clamp(colorChannel(parts.at(1) ?? '0', 1)),
    b: clamp(colorChannel(parts.at(2) ?? '0', 1)),
    a: alpha === undefined || alpha === 'none' ? 1 : Number.parseFloat(alpha.replace('%', '')) / (alpha.endsWith('%') ? 100 : 1),
  };
};

export const parseColor = (value: string): Rgba | null =>
  value.startsWith('#') ? hex(value) : rgb(value);

export const lumChannel = (value: number) => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export const luminance = (color: Rgba) =>
  0.2126 * lumChannel(color.r) + 0.7152 * lumChannel(color.g) + 0.0722 * lumChannel(color.b);

/** fg поверх bg с учётом альфа-канала fg. */
export const over = (fg: Rgba, bg: Rgba): Rgba => ({
  r: clamp(fg.r * fg.a + bg.r * (1 - fg.a)),
  g: clamp(fg.g * fg.a + bg.g * (1 - fg.a)),
  b: clamp(fg.b * fg.a + bg.b * (1 - fg.a)),
  a: 1,
});

export const contrastRatio = (fg: Rgba, bg: Rgba) => {
  const [high, low] = [luminance(fg), luminance(bg)].toSorted((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
};

/** Минимум по WCAG: 4.5 для текста, 3 для крупного текста и компонентов. */
export const contrastLimit = (fontSize: number, fontWeight: number, component = false) =>
  component || fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700) ? 3 : 4.5;
