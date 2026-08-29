/**
 * Variant definitions. Every variant describes:
 * - headTop: topmost body edge in viewBox units — drives scaling and sign placement
 * - eyes: positions and radii for the eye/pupil pair
 * - arms/legs (optional): limb markup plus rotation pivots
 * - body/face: raw SVG markup (drawn in the default dark palette, recolored at build time)
 * - float: hovers instead of walking on legs
 */

export interface EyeConfig {
  lx: number;
  rx: number;
  y: number;
  r: number;
  pr: number;
  pdx: number;
}

export interface ArmConfig {
  lox: number;
  loy: number;
  rox: number;
  roy: number;
  def: number;
  up: number;
  l: string;
  r: string;
}

export interface LegConfig {
  lox: number;
  loy: number;
  rox: number;
  roy: number;
  step: number;
  l: string;
  r: string;
}

export interface VariantConfig {
  headTop: number;
  eyes: EyeConfig;
  arms?: ArmConfig;
  legs?: LegConfig;
  body: string;
  face: string;
  shadow?: string;
  float?: boolean;
}

export const MONO =
  '&quot;JetBrains Mono&quot;, ui-monospace, Menlo, Consolas, monospace';

/** Same stack, unescaped — for CSS on regular DOM nodes (fx bubbles etc.). */
export const MONO_CSS =
  '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';

export const VARIANTS: Record<string, VariantConfig> = {
  classic: {
    headTop: 56,
    eyes: { lx: 49, rx: 71, y: 86, r: 10.5, pr: 4.4, pdx: 2.5 },
    arms: {
      lox: 30, loy: 97, rox: 90, roy: 97, def: 7, up: 200,
      l: '<rect x="25" y="94" width="9" height="27" rx="4.5" fill="#04102B"/>',
      r: '<rect x="86" y="94" width="9" height="27" rx="4.5" fill="#04102B"/>',
    },
    legs: {
      lox: 49, loy: 130, rox: 71, roy: 130, step: 26,
      l: '<rect x="44" y="128" width="10" height="34" rx="5" fill="#04102B"/>',
      r: '<rect x="66" y="128" width="10" height="34" rx="5" fill="#04102B"/>',
    },
    body: '<rect x="34" y="56" width="52" height="80" rx="18" fill="#04102B"/>',
    face:
      '<path d="M53 105 Q60 110 67 105" fill="none" stroke="#5A7297" stroke-width="2.6" stroke-linecap="round"/><rect x="44" y="117" width="20" height="3.6" rx="1.8" fill="#5A7297"/><rect x="44" y="124" width="30" height="3.6" rx="1.8" fill="#5A7297"/>',
  },
  chip: {
    headTop: 62,
    eyes: { lx: 49, rx: 71, y: 88, r: 10, pr: 4.2, pdx: 2.4 },
    legs: {
      lox: 49, loy: 130, rox: 71, roy: 130, step: 26,
      l: '<rect x="44" y="128" width="10" height="34" rx="5" fill="#04102B"/>',
      r: '<rect x="66" y="128" width="10" height="34" rx="5" fill="#04102B"/>',
    },
    body:
      '<rect x="24" y="74" width="8" height="6" rx="2" fill="#5A7297"/><rect x="24" y="90" width="8" height="6" rx="2" fill="#5A7297"/><rect x="24" y="106" width="8" height="6" rx="2" fill="#5A7297"/><rect x="88" y="74" width="8" height="6" rx="2" fill="#5A7297"/><rect x="88" y="90" width="8" height="6" rx="2" fill="#5A7297"/><rect x="88" y="106" width="8" height="6" rx="2" fill="#5A7297"/><rect x="32" y="62" width="56" height="70" rx="8" fill="#04102B"/>',
    face:
      '<path d="M53 108 Q60 113 67 108" fill="none" stroke="#5A7297" stroke-width="2.6" stroke-linecap="round"/><rect x="46" y="119" width="28" height="3.6" rx="1.8" fill="#5A7297"/>',
  },
  blob: {
    headTop: 56,
    eyes: { lx: 47, rx: 73, y: 88, r: 11.5, pr: 4.6, pdx: 2.6 },
    arms: {
      lox: 23, loy: 96, rox: 97, roy: 96, def: 16, up: 205,
      l: '<rect x="18" y="94" width="9" height="24" rx="4.5" fill="#04102B"/>',
      r: '<rect x="93" y="94" width="9" height="24" rx="4.5" fill="#04102B"/>',
    },
    legs: {
      lox: 51, loy: 130, rox: 69, roy: 130, step: 24,
      l: '<rect x="46" y="128" width="10" height="34" rx="5" fill="#04102B"/>',
      r: '<rect x="64" y="128" width="10" height="34" rx="5" fill="#04102B"/>',
    },
    body: '<circle cx="60" cy="96" r="40" fill="#04102B"/>',
    face:
      '<path d="M52 110 Q60 116 68 110" fill="none" stroke="#5A7297" stroke-width="2.6" stroke-linecap="round"/><rect x="48" y="122" width="24" height="3.6" rx="1.8" fill="#5A7297"/>',
  },
  terminal: {
    headTop: 56,
    eyes: { lx: 49, rx: 71, y: 97, r: 10, pr: 4.2, pdx: 2.4 },
    arms: {
      lox: 28, loy: 98, rox: 92, roy: 98, def: 7, up: 200,
      l: '<rect x="24" y="96" width="9" height="26" rx="4.5" fill="#04102B"/>',
      r: '<rect x="87" y="96" width="9" height="26" rx="4.5" fill="#04102B"/>',
    },
    legs: {
      lox: 49, loy: 130, rox: 71, roy: 130, step: 26,
      l: '<rect x="44" y="128" width="10" height="34" rx="5" fill="#04102B"/>',
      r: '<rect x="66" y="128" width="10" height="34" rx="5" fill="#04102B"/>',
    },
    body:
      '<rect x="32" y="56" width="56" height="80" rx="10" fill="#04102B"/><path d="M32 66 a10 10 0 0 1 10 -10 h36 a10 10 0 0 1 10 10 v8 h-56 z" fill="#5A7297"/><circle cx="41" cy="65" r="2.4" fill="#F4F6F9"/><circle cx="49" cy="65" r="2.4" fill="#F4F6F9"/><circle cx="57" cy="65" r="2.4" fill="#F4F6F9"/>',
    face: `<path d="M54 116 Q60 120 66 116" fill="none" stroke="#5A7297" stroke-width="2.4" stroke-linecap="round"/><text x="42" y="130" font-family='${MONO}' font-size="9" font-weight="700" fill="#5A7297">&gt;_</text>`,
  },
  daemon: {
    headTop: 70,
    float: true,
    eyes: { lx: 48, rx: 72, y: 92, r: 11, pr: 4.5, pdx: 2.5 },
    arms: {
      lox: 31, loy: 102, rox: 89, roy: 102, def: 12, up: 205,
      l: '<rect x="26" y="100" width="9" height="22" rx="4.5" fill="#04102B"/>',
      r: '<rect x="85" y="100" width="9" height="22" rx="4.5" fill="#04102B"/>',
    },
    body:
      '<path d="M30 100 a30 30 0 0 1 60 0 v44 l-10 8 -10 -8 -10 8 -10 -8 -10 8 -10 -8 z" fill="#04102B"/>',
    face:
      '<path d="M53 112 Q60 117 67 112" fill="none" stroke="#5A7297" stroke-width="2.6" stroke-linecap="round"/>',
    shadow: '<rect x="42" y="158" width="36" height="4" rx="2" fill="#5A7297"/>',
  },
  packet: {
    headTop: 64,
    eyes: { lx: 48, rx: 72, y: 102, r: 9.5, pr: 4, pdx: 2.2 },
    arms: {
      lox: 22, loy: 90, rox: 98, roy: 90, def: 14, up: 205,
      l: '<rect x="19" y="88" width="6" height="26" rx="3" fill="#04102B"/>',
      r: '<rect x="95" y="88" width="6" height="26" rx="3" fill="#04102B"/>',
    },
    legs: {
      lox: 51, loy: 120, rox: 69, roy: 120, step: 16,
      l: '<rect x="48" y="118" width="6" height="44" rx="3" fill="#04102B"/>',
      r: '<rect x="66" y="118" width="6" height="44" rx="3" fill="#04102B"/>',
    },
    body:
      '<rect x="26" y="64" width="68" height="58" rx="7" fill="#04102B"/><path d="M28 68 L60 90 L92 68" fill="none" stroke="#5A7297" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    face: '',
  },
  cursor: {
    headTop: 48,
    eyes: { lx: 53, rx: 67, y: 72, r: 7, pr: 3, pdx: 1.8 },
    legs: {
      lox: 52, loy: 152, rox: 68, roy: 152, step: 20,
      l: '<rect x="46" y="150" width="12" height="12" rx="4" fill="#04102B"/>',
      r: '<rect x="62" y="150" width="12" height="12" rx="4" fill="#04102B"/>',
    },
    body: '<rect x="44" y="48" width="32" height="104" rx="5" fill="#04102B"/>',
    face:
      '<path d="M56 88 Q60 91 64 88" fill="none" stroke="#5A7297" stroke-width="2.4" stroke-linecap="round"/><rect x="50" y="134" width="20" height="4.5" rx="2" fill="#5A7297"/>',
  },
};

/** Legacy German variant names, kept as aliases for backwards compatibility. */
export const VARIANT_ALIASES: Record<string, string> = {
  klassiker: 'classic',
  paket: 'packet',
};

export function resolveVariant(name: string | null): string {
  if (!name) return 'classic';
  if (VARIANTS[name]) return name;
  const alias = VARIANT_ALIASES[name];
  return alias && VARIANTS[alias] ? alias : 'classic';
}
