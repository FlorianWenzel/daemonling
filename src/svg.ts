import { DEFAULT_BODY, DEFAULT_DETAIL, isLight } from './color';
import { MONO, MONO_CSS, type EyeConfig, type VariantConfig } from './variants';

export type SignStyle = 'sign' | 'bubble';

export interface SignOptions {
  style: SignStyle;
  bg: string;
  text: string;
  border: string;
  hand: string;
}

function eyesMarkup(e: EyeConfig): string {
  const d = Math.max(3.4, e.r * 0.5);
  const sw = Math.max(2.2, e.r * 0.32);
  return `<g id="eyesN">
    <g id="eyeL"><circle cx="${e.lx}" cy="${e.y}" r="${e.r}" fill="#F4F6F9"/><g id="pupL"><circle cx="${e.lx + e.pdx}" cy="${e.y}" r="${e.pr}" fill="__PUP__"/></g></g>
    <g id="eyeR"><circle cx="${e.rx}" cy="${e.y}" r="${e.r}" fill="#F4F6F9"/><g id="pupR"><circle cx="${e.rx + e.pdx}" cy="${e.y}" r="${e.pr}" fill="__PUP__"/></g></g></g>
  <g id="eyesX" stroke="__XEYE__" stroke-width="${sw}" stroke-linecap="round" fill="none">
    <path d="M${e.lx - d} ${e.y - d} ${e.lx + d} ${e.y + d} M${e.lx + d} ${e.y - d} ${e.lx - d} ${e.y + d} M${e.rx - d} ${e.y - d} ${e.rx + d} ${e.y + d} M${e.rx + d} ${e.y - d} ${e.rx - d} ${e.y + d}"/></g>`;
}

function signMarkup(c: VariantConfig, o: SignOptions): string {
  const top = c.headTop - 50;
  const label = `<text id="signText" x="60" y="${top + 28}" text-anchor="middle" font-family='${MONO}' font-size="19" font-weight="700" fill="${o.text}">WORD</text>`;
  if (o.style === 'bubble') {
    const b = top + 42;
    return `<g id="signGrp"><g id="signFlip">
    <path d="M46 ${b - 4} L60 ${b + 12} L74 ${b - 4} Z" fill="${o.bg}" stroke="${o.border}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="4" y="${top}" width="112" height="42" rx="17" fill="${o.bg}" stroke="${o.border}" stroke-width="3"/>
    <path d="M49 ${b - 3} L60 ${b + 9} L71 ${b - 3} Z" fill="${o.bg}"/>${label}</g></g>`;
  }
  const hands = c.arms
    ? `<circle cx="25" cy="${top + 45}" r="5" fill="${o.hand}"/><circle cx="95" cy="${top + 45}" r="5" fill="${o.hand}"/>`
    : '';
  return `<g id="signGrp"><g id="signFlip">${hands}
    <rect x="4" y="${top}" width="112" height="42" rx="7" fill="${o.bg}" stroke="${o.border}" stroke-width="3"/>${label}</g></g>`;
}

export function buildSVG(
  c: VariantConfig,
  color: string,
  detail: string,
  signO: SignOptions,
): string {
  const legs = c.legs
    ? `<g id="legL">${c.legs.l}</g><g id="legR">${c.legs.r}</g>`
    : '';
  const arms = c.arms
    ? `<g id="armL">${c.arms.l}</g><g id="armR">${c.arms.r}</g>`
    : '';
  let parts = `${c.shadow ? `<g id="shadow">${c.shadow}</g>` : ''}|SPLIT|${legs}|SPLIT|<g id="bob"><g id="breathe">${arms}${c.body}${eyesMarkup(c.eyes)}${c.face || ''}`;
  // Recolor body + detail; the sign is added afterwards with its own explicit colors.
  if (color && color !== DEFAULT_BODY)
    parts = parts
      .split(DEFAULT_BODY)
      .join(color)
      .split(DEFAULT_DETAIL)
      .join(detail);
  const light = isLight(color);
  parts = parts
    .split('__PUP__')
    .join(light ? DEFAULT_BODY : color || DEFAULT_BODY)
    .split('__XEYE__')
    .join(light ? DEFAULT_BODY : '#F4F6F9');
  const [shadowC, legsC, restC] = parts.split('|SPLIT|');
  return `<svg viewBox="0 0 120 162" width="120" height="162">
  <g id="figure">${shadowC}<g id="hover"><g id="tilt">
    ${legsC}
    ${restC}${signMarkup(c, signO)}
    </g></g>
  </g></g></g></svg>`;
}

export function buildCSS(c: VariantConfig, signStyle: SignStyle): string {
  const e = c.eyes;
  let css = `
:host{position:absolute;left:0;bottom:0;display:block;pointer-events:none;}
#mover{position:absolute;left:0;bottom:0;will-change:transform;visibility:hidden;}
#boomHost{position:absolute;left:50%;bottom:0;width:0;height:0;}
#pop{transform-origin:50% 100%;}
#flip{transform-origin:50% 100%;transition:transform .16s ease;}
svg{display:block;overflow:visible;}
#tilt{transform-box:view-box;transform-origin:60px 150px;transition:transform 1.1s ease-in-out;}
#bob{transform-box:view-box;transform-origin:60px 140px;}
#breathe{transform-box:view-box;transform-origin:60px 136px;}
#figure{transform-box:view-box;transform-origin:60px 110px;}
#hover{transform-box:view-box;}
#eyeL{transform-box:view-box;transform-origin:${e.lx}px ${e.y}px;transition:transform .15s ease;}
#eyeR{transform-box:view-box;transform-origin:${e.rx}px ${e.y}px;transition:transform .15s ease;}
#pupL{transform-box:view-box;transform-origin:${e.lx}px ${e.y}px;transition:transform .15s ease;}
#pupR{transform-box:view-box;transform-origin:${e.rx}px ${e.y}px;transition:transform .15s ease;}
#signGrp{transform-box:view-box;opacity:0;transform:translateY(34px) scale(.5);transform-origin:60px ${c.headTop - 6}px;transition:transform .34s cubic-bezier(.34,1.56,.64,1),opacity .18s ease;}
#signFlip{transform-box:view-box;transform-origin:60px ${c.headTop - 29}px;}
#eyesX{opacity:0;transition:opacity .3s ease;}
#eyesN{transition:opacity .3s ease;}
.alive #eyeL,.alive #eyeR{animation:dl-blink 4.2s ease-in-out infinite;}
.breathing #breathe{animation:dl-breathe 2.7s ease-in-out infinite;}
.showing #signGrp{opacity:1;transform:translateY(0) scale(1);}
.zombie #tilt{transform:rotate(9deg);}
.zombie #bob{animation:dl-zwob 1.9s ease-in-out infinite;}
.zombie #eyesX{opacity:1;}
.zombie #eyesN{opacity:0;}
.panic #figure{animation:dl-shake .08s linear infinite;}
.panic #eyeL,.panic #eyeR{animation:none;transform:scale(1.32);}
.panic #pupL,.panic #pupR{transform:scale(.5);}
.panic #signGrp,.zombie #signGrp,.sleeping #signGrp{opacity:0;transform:translateY(34px) scale(.5);}
.sleeping #eyeL,.sleeping #eyeR{animation:none;transform:scaleY(.13);}
.sleeping #breathe{animation:dl-breathe 4.4s ease-in-out infinite;}
.sleeping #tilt{transform:rotate(4deg);}
.startled #figure{animation:dl-shake .09s linear 6;}
.startled #eyeL,.startled #eyeR{animation:none;transform:scale(1.3);}
.startled #pupL,.startled #pupR{transform:scale(.55) !important;}
.frozen svg{filter:grayscale(1) opacity(.8);}
.frozen *{animation-play-state:paused !important;}
#fxHost{position:absolute;left:50%;bottom:0;width:0;height:0;}
.dl-z{position:absolute;left:6px;bottom:0;font-family:${MONO_CSS};font-weight:700;opacity:0;}
.dl-think{position:absolute;left:8px;bottom:2px;transform-origin:0 100%;background:#FFFFFF;border:3px solid;border-radius:14px;padding:8px 11px;display:flex;gap:5px;}
.dl-think i{width:7px;height:7px;border-radius:50%;background:currentColor;animation:dl-dot 1s ease-in-out infinite;}
.dl-think i:nth-child(2){animation-delay:.15s;}
.dl-think i:nth-child(3){animation-delay:.3s;}
@keyframes dl-dot{0%,100%{transform:translateY(0);opacity:.45}40%{transform:translateY(-4px);opacity:1}}
@keyframes dl-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.15)}}
@keyframes dl-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.02,.965)}}
@keyframes dl-zwob{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2.5deg)}}
@keyframes dl-shake{0%{transform:translate(-2.5px,.5px) rotate(-1.6deg)}50%{transform:translate(2.5px,-1px) rotate(1.6deg)}100%{transform:translate(-2.5px,.5px) rotate(-1.6deg)}}
`;
  if (c.arms) {
    css += `
#armL{transform-box:view-box;transform-origin:${c.arms.lox}px ${c.arms.loy}px;transition:transform .3s cubic-bezier(.34,1.56,.64,1);transform:rotate(${c.arms.def}deg);}
#armR{transform-box:view-box;transform-origin:${c.arms.rox}px ${c.arms.roy}px;transition:transform .3s cubic-bezier(.34,1.56,.64,1);transform:rotate(${-c.arms.def}deg);}
.panic #armL{transform:rotate(-30deg);}
.panic #armR{transform:rotate(30deg);}
.pointing #armR{transform:rotate(-90deg);}
.cheer #armL{transform:rotate(${-c.arms.up}deg);}
.cheer #armR{transform:rotate(${c.arms.up}deg);}
.waving #armR{animation:dl-wave 1.5s ease-in-out;}
@keyframes dl-wave{0%,100%{transform:rotate(${-c.arms.def}deg)}18%{transform:rotate(${c.arms.up}deg)}34%{transform:rotate(${c.arms.up - 45}deg)}50%{transform:rotate(${c.arms.up}deg)}66%{transform:rotate(${c.arms.up - 45}deg)}84%{transform:rotate(${c.arms.up}deg)}}
`;
    if (signStyle !== 'bubble')
      css += `
.showing #armL{transform:rotate(${-c.arms.up}deg);}
.showing #armR{transform:rotate(${c.arms.up}deg);}
`;
  } else
    css += `
.waving #bob{animation:dl-wavetilt 1.5s ease-in-out;}
.pointing #bob{transform:rotate(9deg);}
.cheer #bob{animation:dl-wavetilt 1s ease-in-out infinite;}
@keyframes dl-wavetilt{0%,100%{transform:rotate(0deg)}20%,60%{transform:rotate(-9deg)}40%,80%{transform:rotate(9deg)}}
`;
  if (c.legs)
    css += `
#legL{transform-box:view-box;transform-origin:${c.legs.lox}px ${c.legs.loy}px;}
#legR{transform-box:view-box;transform-origin:${c.legs.rox}px ${c.legs.roy}px;}
.walking #legL{animation:dl-stepA .34s ease-in-out infinite;}
.walking #legR{animation:dl-stepB .34s ease-in-out infinite;}
.walking #bob{animation:dl-bob .34s ease-in-out infinite;}
@keyframes dl-stepA{0%,100%{transform:rotate(${c.legs.step}deg)}50%{transform:rotate(${-c.legs.step}deg)}}
@keyframes dl-stepB{0%,100%{transform:rotate(${-c.legs.step}deg)}50%{transform:rotate(${c.legs.step}deg)}}
@keyframes dl-bob{0%,100%{transform:translateY(0) rotate(2deg)}50%{transform:translateY(-4.5px) rotate(-2deg)}}
`;
  else
    css += `
.walking #bob{animation:dl-glide .5s ease-in-out infinite;}
@keyframes dl-glide{0%,100%{transform:translateY(0) rotate(2.5deg)}50%{transform:translateY(-4px) rotate(-2.5deg)}}
`;
  if (c.float)
    css += `
#hover{animation:dl-float 2.6s ease-in-out infinite;}
@keyframes dl-float{0%,100%{transform:translateY(-6px)}50%{transform:translateY(-13px)}}
`;
  return css;
}
