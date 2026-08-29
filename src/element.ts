import { DEFAULT_BODY, DEFAULT_DETAIL, detailFor } from './color';
import { buildCSS, buildSVG, type SignStyle } from './svg';
import { resolveVariant, VARIANTS, type VariantConfig } from './variants';

export type DaemonlingState =
  | 'hidden'
  | 'idle'
  | 'walking'
  | 'showing'
  | 'waving'
  | 'jumping'
  | 'pointing'
  | 'thinking'
  | 'sleeping'
  | 'startled'
  | 'frozen'
  | 'cheering'
  | 'zombie'
  | 'exploding';

export type Direction = 'left' | 'right';
export type LookDirection = 'left' | 'right' | 'up' | 'down' | 'center';

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** States in which most actions are ignored. */
const BLOCK: DaemonlingState[] = [
  'hidden',
  'exploding',
  'zombie',
  'frozen',
  'sleeping',
];

/** Legacy German direction names, accepted everywhere a direction is taken. */
const DIR_ALIASES: Record<string, string> = {
  links: 'left',
  rechts: 'right',
  oben: 'up',
  unten: 'down',
  mitte: 'center',
};
const dir = (d: string | null | undefined): string =>
  DIR_ALIASES[d ?? ''] ?? d ?? '';

/**
 * `<daemonling-sprite>` — a small animated process character that lives
 * transparently on top of a slide or any `position:relative` container.
 *
 * Attributes:
 *   variant  one of Daemonling.variants (default "classic")
 *   color    body color, any CSS color (default #04102B; detail accents are
 *            derived automatically)
 *   size     figure height in px (default 90)
 *   speed    walking speed in px/s at size=90 (default 300)
 *
 * Sign (code word):
 *   sign-style         "sign" (default) or "bubble" (speech bubble)
 *   sign-color         background (default #D9FF3C, #FFFFFF for bubbles)
 *   sign-text-color    text color   (default #04102B)
 *   sign-border-color  border color (default #04102B)
 *
 * All methods are async and resolve when the animation settles.
 */
export class Daemonling extends HTMLElement {
  static get observedAttributes(): string[] {
    return [
      'size',
      'variant',
      'color',
      'sign-style',
      'sign-color',
      'sign-text-color',
      'sign-border-color',
    ];
  }

  static get variants(): string[] {
    return Object.keys(VARIANTS);
  }

  private _x = 0;
  private _state: DaemonlingState = 'hidden';
  private _tok = 0;
  private _facing = 1;
  private _w = 120;
  private _word = 'WORD';
  private _lookDir = 'center';
  private _zzzT: ReturnType<typeof setInterval> | null = null;
  private _cfg!: VariantConfig;
  private _detail = DEFAULT_DETAIL;
  private _styleEl: HTMLStyleElement;
  private _mover: HTMLDivElement;
  private _pop: HTMLDivElement;
  private _flip: HTMLDivElement;
  private _boomHost: HTMLDivElement;
  private _fxHost: HTMLDivElement;
  private _svg!: SVGSVGElement;
  private _signText!: SVGTextElement;

  constructor() {
    super();
    const sh = this.attachShadow({ mode: 'open' });
    sh.innerHTML =
      '<style></style><div id="mover"><div id="pop"><div id="flip"></div></div><div id="boomHost"></div><div id="fxHost"></div></div>';
    this._styleEl = sh.querySelector('style')!;
    this._mover = sh.querySelector('#mover')!;
    this._pop = sh.querySelector('#pop')!;
    this._flip = sh.querySelector('#flip')!;
    this._boomHost = sh.querySelector('#boomHost')!;
    this._fxHost = sh.querySelector('#fxHost')!;
    this._build();
  }

  connectedCallback(): void {
    this._applySize();
  }

  attributeChangedCallback(name: string): void {
    if (!this._flip) return;
    if (name === 'size') this._applySize();
    else this._build();
  }

  get size(): number {
    const v = parseFloat(this.getAttribute('size') ?? '');
    return v > 0 ? v : 90;
  }
  set size(v: number) {
    this.setAttribute('size', String(v));
  }

  get speed(): number {
    const v = parseFloat(this.getAttribute('speed') ?? '');
    return ((v > 0 ? v : 300) * this.size) / 90;
  }
  set speed(v: number) {
    this.setAttribute('speed', String(v));
  }

  get variant(): string {
    return resolveVariant(this.getAttribute('variant'));
  }
  set variant(v: string) {
    this.setAttribute('variant', v);
  }

  get color(): string {
    return this.getAttribute('color') || DEFAULT_BODY;
  }
  set color(v: string) {
    this.setAttribute('color', v);
  }

  get signStyle(): SignStyle {
    const v = this.getAttribute('sign-style');
    return v === 'bubble' || v === 'blase' ? 'bubble' : 'sign';
  }
  set signStyle(v: SignStyle) {
    this.setAttribute('sign-style', v);
  }

  get signColor(): string {
    return (
      this.getAttribute('sign-color') ||
      (this.signStyle === 'bubble' ? '#FFFFFF' : '#D9FF3C')
    );
  }
  set signColor(v: string) {
    this.setAttribute('sign-color', v);
  }

  get signTextColor(): string {
    return this.getAttribute('sign-text-color') || DEFAULT_BODY;
  }
  set signTextColor(v: string) {
    this.setAttribute('sign-text-color', v);
  }

  get signBorderColor(): string {
    return this.getAttribute('sign-border-color') || DEFAULT_BODY;
  }
  set signBorderColor(v: string) {
    this.setAttribute('sign-border-color', v);
  }

  /** Current lifecycle state. */
  get state(): DaemonlingState {
    return this._state;
  }

  /** Current x position (px) within the container. */
  get x(): number {
    return this._x;
  }

  private _build(): void {
    this._cfg = VARIANTS[this.variant];
    this._styleEl.textContent = buildCSS(this._cfg, this.signStyle);
    this._detail = detailFor(this.color);
    this._flip.innerHTML = buildSVG(this._cfg, this.color, this._detail, {
      style: this.signStyle,
      bg: this.signColor,
      text: this.signTextColor,
      border: this.signBorderColor,
      hand: this.color,
    });
    this._svg = this._flip.querySelector('svg')!;
    this._signText = this._flip.querySelector('#signText')!;
    this._setWordText(this._word);
    this._applyLook();
    this._applySignFlip();
    if (this._state === 'exploding' || this._state === 'hidden')
      this._svg.style.opacity = this._state === 'exploding' ? '0' : '';
    this._applySize();
  }

  private _applySize(): void {
    const k = this.size / (162 - this._cfg.headTop);
    this._w = 120 * k;
    this._svg.setAttribute('width', String(this._w));
    this._svg.setAttribute('height', String(162 * k));
    this._boomHost.style.bottom = this.size * 0.52 + 'px';
    this._fxHost.style.bottom = this.size + 'px';
    this._apply();
  }

  private _apply(): void {
    this._mover.style.transform = `translateX(${this._x - this._w / 2}px)`;
  }

  private _face(d: number, instant?: boolean): void {
    this._facing = d;
    if (instant) this._flip.style.transition = 'none';
    this._flip.style.transform = `scaleX(${d})`;
    if (instant)
      requestAnimationFrame(() => {
        this._flip.style.transition = '';
      });
    this._applyLook();
    this._applySignFlip();
  }

  /** Counter-flip the sign so its text stays readable when facing left. */
  private _applySignFlip(): void {
    const sf = this._flip.querySelector<SVGGElement>('#signFlip');
    if (sf) sf.style.transform = `scaleX(${this._facing})`;
  }

  private _mode(state: DaemonlingState, cls: string): void {
    this._state = state;
    this._mover.className = cls;
  }

  private _setWordText(w: string): void {
    this._word = w;
    this._signText.textContent = w;
    this._signText.setAttribute(
      'font-size',
      Math.min(20, 102 / (0.62 * w.length)).toFixed(1),
    );
  }

  /** Pop up at x (px within the container). */
  async spawn(x?: number): Promise<void> {
    this._tok++;
    this._clearBoom();
    this._clearFx();
    if (typeof x === 'number') this._x = x;
    else if (!this._x) this._x = 200;
    this._apply();
    this._face(1, true);
    this._svg.style.opacity = '';
    this._mover.style.visibility = 'visible';
    this._mode('idle', 'alive breathing');
    const a = this._pop.animate?.(
      [
        { transform: 'scale(0)' },
        { transform: 'scale(1.18,1.12)', offset: 0.65 },
        { transform: 'scale(.95,1.03)', offset: 0.85 },
        { transform: 'scale(1)' },
      ],
      { duration: 420, easing: 'ease-out' },
    );
    if (a) await a.finished.catch(() => {});
  }

  /** Walk to x, facing the direction of travel. `opts.speed` overrides px/s for this walk only. */
  async walkTo(x: number, opts?: { speed?: number }): Promise<void> {
    if (BLOCK.includes(this._state)) return;
    const t = ++this._tok;
    if (Math.abs(x - this._x) < 2) {
      this._mode('idle', 'alive breathing');
      return;
    }
    this._face(x > this._x ? 1 : -1);
    this._mode('walking', 'alive walking');
    const sp =
      opts?.speed && opts.speed > 0
        ? (opts.speed * this.size) / 90
        : this.speed;
    await new Promise<void>((res) => {
      let last: number | undefined;
      const step = (now: number) => {
        if (t !== this._tok) {
          res();
          return;
        }
        if (last === undefined) last = now;
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        const d = Math.sign(x - this._x);
        this._x += d * sp * dt;
        if (d >= 0 ? this._x >= x : this._x <= x) {
          this._x = x;
          this._apply();
          res();
          return;
        }
        this._apply();
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    if (t === this._tok) this._mode('idle', 'alive breathing');
  }

  /** Stop and hold up the sign with the given word (max 14 chars, uppercased). */
  async showWord(word: string): Promise<void> {
    if (BLOCK.includes(this._state)) return;
    this._tok++;
    const w =
      String(word == null ? '' : word)
        .toUpperCase()
        .slice(0, 14) || '???';
    this._setWordText(w);
    this._mode('showing', 'alive breathing showing');
    await wait(380);
  }

  /** Lower the sign again. */
  async hideWord(): Promise<void> {
    if (this._state !== 'showing') return;
    this._mode('idle', 'alive breathing');
    await wait(260);
  }

  /** Set the gaze direction, instantly: 'left' | 'right' | 'up' | 'down' | 'center'. */
  look(d: LookDirection | string): void {
    this._lookDir = dir(d) || 'center';
    this._applyLook();
  }

  private _applyLook(): void {
    const map: Record<string, [number, number]> = {
      left: [-1, 0],
      right: [1, 0],
      up: [0, -0.9],
      down: [0, 0.9],
    };
    const v = map[this._lookDir] || [0, 0];
    const e = this._cfg.eyes;
    const k = e.r - e.pr - 1.2;
    const dx = v[0] * k * this._facing - (v[0] || v[1] ? e.pdx : 0);
    const dy = v[1] * k;
    for (const id of ['pupL', 'pupR']) {
      const el = this._flip.querySelector<SVGGElement>('#' + id);
      if (el) el.style.transform = `translate(${dx}px,${dy}px)`;
    }
  }

  /** Wave with the right arm (armless variants tilt-wave instead). */
  async wave(): Promise<void> {
    if (BLOCK.includes(this._state)) return;
    const t = ++this._tok;
    this._mode('waving', 'alive breathing waving');
    await wait(1500);
    if (t === this._tok) this._mode('idle', 'alive breathing');
  }

  /** Hop once, with squash & stretch. */
  async jump(): Promise<void> {
    if (BLOCK.includes(this._state)) return;
    const t = ++this._tok;
    const k = this.size / 90;
    this._mode('jumping', 'alive breathing');
    const a = this._pop.animate?.(
      [
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(0) scale(1.08,.88)', offset: 0.18 },
        { transform: `translateY(${-40 * k}px) scale(.94,1.08)`, offset: 0.5 },
        { transform: 'translateY(0) scale(1.05,.92)', offset: 0.82 },
        { transform: 'translateY(0) scale(1)' },
      ],
      { duration: 620, easing: 'ease-in-out' },
    );
    if (a) await a.finished.catch(() => {});
    if (t === this._tok) this._mode('idle', 'alive breathing');
  }

  /** Point in a direction ('left' | 'right') for `ms` (default 1400). */
  async point(d: Direction | string, ms?: number): Promise<void> {
    if (BLOCK.includes(this._state)) return;
    const t = ++this._tok;
    this._face(dir(d) === 'left' ? -1 : 1);
    this._mode('pointing', 'alive breathing pointing');
    await wait(ms && ms > 0 ? ms : 1400);
    if (t === this._tok) this._mode('idle', 'alive breathing');
  }

  /** Show a thought bubble with pulsing dots for `ms` (default 1800). */
  async think(ms?: number): Promise<void> {
    if (BLOCK.includes(this._state)) return;
    const t = ++this._tok;
    this._mode('thinking', 'alive breathing');
    const b = document.createElement('div');
    b.className = 'dl-think';
    b.style.color = this.color;
    b.style.borderColor = this.color;
    b.style.transform = `scale(${this.size / 90})`;
    b.innerHTML = '<i></i><i></i><i></i>';
    this._fxHost.appendChild(b);
    await wait(ms && ms > 0 ? ms : 1800);
    b.remove();
    if (t === this._tok) this._mode('idle', 'alive breathing');
  }

  /** Fall asleep (zZz). Stays asleep until wake(). */
  async sleep(): Promise<void> {
    if (BLOCK.includes(this._state)) return;
    this._tok++;
    this._mode('sleeping', 'sleeping');
    this._zzz();
    await wait(400);
  }

  /** Wake up from sleep(). */
  async wake(): Promise<void> {
    if (this._state !== 'sleeping') return;
    this._clearFx();
    this._mode('idle', 'alive breathing');
    const a = this._pop.animate?.(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.07,.94)' },
        { transform: 'scale(1)' },
      ],
      { duration: 260, easing: 'ease-out' },
    );
    if (a) await a.finished.catch(() => {});
  }

  /** Startle briefly (an interrupt!). */
  async startle(): Promise<void> {
    if (
      this._state === 'hidden' ||
      this._state === 'exploding' ||
      this._state === 'zombie' ||
      this._state === 'frozen'
    )
      return;
    const t = ++this._tok;
    this._clearFx();
    this._mode('startled', 'alive startled');
    await wait(560);
    if (t === this._tok) this._mode('idle', 'alive breathing');
  }

  /** Freeze in place: grayscale, pose frozen (SIGSTOP). */
  async freeze(): Promise<void> {
    if (
      this._state === 'hidden' ||
      this._state === 'exploding' ||
      this._state === 'frozen'
    )
      return;
    this._tok++;
    this._clearFx();
    this._state = 'frozen';
    this._mover.classList.add('frozen');
    await wait(300);
  }

  /** Thaw from freeze() (SIGCONT). */
  async unfreeze(): Promise<void> {
    if (this._state !== 'frozen') return;
    this._mode('idle', 'alive breathing');
    await wait(200);
  }

  /** Cheer with confetti (exit 0). */
  async celebrate(): Promise<void> {
    if (BLOCK.includes(this._state)) return;
    const t = ++this._tok;
    const k = this.size / 90;
    this._mode('cheering', 'alive cheer');
    this._confetti();
    const a = this._pop.animate?.(
      [
        { transform: 'translateY(0)' },
        { transform: `translateY(${-15 * k}px)`, offset: 0.5 },
        { transform: 'translateY(0)' },
      ],
      { duration: 330, iterations: 3, easing: 'ease-in-out' },
    );
    if (a) await a.finished.catch(() => {});
    if (t === this._tok) this._mode('idle', 'alive breathing');
  }

  /** Duplicate; resolves with the clone element (or null if blocked). */
  async fork(): Promise<Daemonling | null> {
    if (BLOCK.includes(this._state)) return null;
    this._tok++;
    this._mode('idle', 'alive breathing');
    const clone = document.createElement(
      this.tagName.toLowerCase(),
    ) as Daemonling;
    for (const at of [
      'size',
      'variant',
      'color',
      'speed',
      'sign-style',
      'sign-color',
      'sign-text-color',
      'sign-border-color',
    ])
      if (this.hasAttribute(at)) clone.setAttribute(at, this.getAttribute(at)!);
    clone.style.cssText = this.style.cssText;
    (this.parentElement || (this.getRootNode() as ParentNode)).appendChild(
      clone,
    );
    this._pop.animate?.(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.16,.88)' },
        { transform: 'scale(1)' },
      ],
      { duration: 280, easing: 'ease-out' },
    );
    await clone.spawn(this._x);
    await clone.walkTo(this._x + (74 * this.size) / 90);
    return clone;
  }

  private _zzz(): void {
    const mk = () => {
      if (this._state !== 'sleeping') return;
      const k = this.size / 90;
      const z = document.createElement('div');
      z.className = 'dl-z';
      z.textContent = 'z';
      z.style.color = this.color;
      z.style.fontSize = 13 * k + 'px';
      this._fxHost.appendChild(z);
      z.animate?.(
        [
          { transform: 'translate(4px,4px) scale(.6)', opacity: 0 },
          { opacity: 0.95, offset: 0.25 },
          {
            transform: `translate(${24 * k}px,${-30 * k}px) scale(1.3)`,
            opacity: 0,
          },
        ],
        { duration: 1700, easing: 'ease-out', fill: 'forwards' },
      );
      setTimeout(() => z.remove(), 1750);
    };
    mk();
    this._zzzT = setInterval(mk, 850);
  }

  private _confetti(): void {
    const k = this.size / 90;
    const host = this._fxHost;
    const cols = [
      this.color,
      this._detail || DEFAULT_DETAIL,
      '#D9FF3C',
      '#FF4E6A',
      '#4EA8FF',
      '#F4F6F9',
    ];
    for (let i = 0; i < 18; i++) {
      const s = document.createElement('div');
      const sz = (4 + Math.random() * 5) * k;
      s.style.cssText = `position:absolute;left:${-sz / 2}px;top:${-sz / 2}px;width:${sz}px;height:${sz * (Math.random() < 0.5 ? 1 : 0.55)}px;background:${cols[i % cols.length]};border-radius:${Math.random() < 0.3 ? '50%' : '1px'};`;
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
      const dist = (40 + Math.random() * 60) * k;
      s.animate?.(
        [
          { transform: 'translate(0,10px) rotate(0deg)', opacity: 1 },
          {
            transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) rotate(${Math.random() * 400 - 200}deg)`,
            opacity: 1,
            offset: 0.55,
          },
          {
            transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist + 42 * k}px) rotate(${Math.random() * 600 - 300}deg)`,
            opacity: 0,
          },
        ],
        {
          duration: 900 + Math.random() * 300,
          easing: 'cubic-bezier(.2,.7,.4,1)',
          fill: 'forwards',
        },
      );
      host.appendChild(s);
      setTimeout(() => s.remove(), 1300);
    }
  }

  private _clearFx(): void {
    if (this._zzzT) {
      clearInterval(this._zzzT);
      this._zzzT = null;
    }
    this._fxHost.innerHTML = '';
  }

  /** Eyes turn to crosses, figure tilts over and wobbles quietly. */
  async zombie(): Promise<void> {
    if (this._state === 'hidden' || this._state === 'exploding') return;
    this._tok++;
    this._clearFx();
    this._mode('zombie', 'zombie');
    await wait(600);
  }

  /** Panic, then explode into splinters and disappear. */
  async terminate(): Promise<void> {
    if (this._state === 'hidden' || this._state === 'exploding') return;
    const t = ++this._tok;
    this._clearFx();
    this._mode('exploding', 'panic');
    await wait(450);
    if (t !== this._tok) return;
    this._svg.style.opacity = '0';
    this._mover.className = '';
    this._boom();
    await wait(850);
    if (t !== this._tok) return;
    this._mover.style.visibility = 'hidden';
    this._state = 'hidden';
  }

  /** Disappear immediately, without the explosion. */
  despawn(): void {
    this._tok++;
    this._clearBoom();
    this._clearFx();
    this._svg.style.opacity = '';
    this._mover.style.visibility = 'hidden';
    this._mover.className = '';
    this._state = 'hidden';
  }

  private _boom(): void {
    const k = this.size / 90;
    const host = this._boomHost;
    const flash = document.createElement('div');
    flash.style.cssText = `position:absolute;left:${-32 * k}px;top:${-32 * k}px;width:${64 * k}px;height:${64 * k}px;border-radius:50%;background:#FF4E6A;`;
    host.appendChild(flash);
    flash.animate?.(
      [
        { transform: 'scale(.2)', opacity: 1 },
        { transform: 'scale(1.2)', opacity: 0.9, offset: 0.4 },
        { transform: 'scale(1.5)', opacity: 0 },
      ],
      { duration: 450, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' },
    );
    const ring = document.createElement('div');
    ring.style.cssText = `position:absolute;left:${-45 * k}px;top:${-45 * k}px;width:${90 * k}px;height:${90 * k}px;border-radius:50%;border:${3 * k}px solid ${this.color};box-sizing:border-box;`;
    host.appendChild(ring);
    ring.animate?.(
      [
        { transform: 'scale(.2)', opacity: 1 },
        { transform: 'scale(1.6)', opacity: 0 },
      ],
      { duration: 560, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' },
    );
    const cols = [
      this.color,
      this.color,
      this._detail || DEFAULT_DETAIL,
      '#F4F6F9',
      '#FF4E6A',
      '#FF4E6A',
    ];
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('div');
      const sz = (4 + Math.random() * 7) * k;
      s.style.cssText = `position:absolute;left:${-sz / 2}px;top:${-sz / 2}px;width:${sz}px;height:${sz}px;background:${cols[i % cols.length]};border-radius:${Math.random() < 0.3 ? '50%' : '2px'};`;
      const ang = (i / 14) * Math.PI * 2 + Math.random() * 0.5;
      const dist = (46 + Math.random() * 55) * k;
      s.animate?.(
        [
          { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
          {
            transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist - 18 * k}px) rotate(${Math.random() * 520 - 260}deg)`,
            opacity: 0,
          },
        ],
        {
          duration: 620 + Math.random() * 220,
          easing: 'cubic-bezier(.15,.7,.3,1)',
          fill: 'forwards',
        },
      );
      host.appendChild(s);
    }
    setTimeout(() => this._clearBoom(), 950);
  }

  private _clearBoom(): void {
    this._boomHost.innerHTML = '';
  }
}
