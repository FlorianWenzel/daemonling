export const DEFAULT_BODY = '#04102B';
export const DEFAULT_DETAIL = '#5A7297';

let _ctx: CanvasRenderingContext2D | null = null;

function rgbOf(str: string): [number, number, number] {
  if (!_ctx) _ctx = document.createElement('canvas').getContext('2d');
  const ctx = _ctx;
  if (!ctx) return [4, 16, 43];
  ctx.fillStyle = '#000';
  ctx.fillStyle = str;
  const v = ctx.fillStyle as string;
  if (v[0] === '#')
    return [
      parseInt(v.slice(1, 3), 16),
      parseInt(v.slice(3, 5), 16),
      parseInt(v.slice(5, 7), 16),
    ];
  const m = v.match(/[\d.]+/g) || ['0', '0', '0'];
  return [+m[0], +m[1], +m[2]];
}

export function isLight(color: string | null): boolean {
  const [r, g, b] = rgbOf(color || DEFAULT_BODY);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

/** Derive the detail/accent color from the body color: dark bodies get a lighter accent, light bodies a darker one. */
export function detailFor(color: string | null): string {
  if (!color || color === DEFAULT_BODY) return DEFAULT_DETAIL;
  const c = rgbOf(color);
  const target = isLight(color) ? [4, 16, 43] : [244, 246, 249];
  const t = isLight(color) ? 0.45 : 0.42;
  return (
    '#' +
    c
      .map((v, i) =>
        Math.round(v + (target[i] - v) * t)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
