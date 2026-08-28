import { DEFAULT_BODY, DEFAULT_DETAIL, detailFor } from './color';
import { buildCSS, buildSVG } from './svg';
import { resolveVariant, VARIANTS, type VariantConfig } from './variants';

export type DaemonlingState =
  | 'hidden'
  | 'idle'
  | 'walking'
  | 'showing'
  | 'zombie'
  | 'exploding';

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * `<daemonling-sprite>` — a small animated process character that lives
 * transparently on top of a slide or any `position:relative` container.
 *
 * Attributes:
 *   variant  one of Daemonling.variants (default "classic")
 *   color    body color, any CSS color (default #04102B; the accent color of
 *            the details is derived automatically, the sign stays dark)
 *   size     figure height in px (default 90)
 *   speed    walking speed in px/s at size=90 (default 300)
 *
 * All methods are async and resolve when the animation settles.
 */
export class Daemonling extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['size', 'variant', 'color'];
  }

  static get variants(): string[] {
    return Object.keys(VARIANTS);
  }

  private _x = 0;
  private _state: DaemonlingState = 'hidden';
  private _tok = 0;
  private _w = 120;
  private _word = 'WORD';
  private _cfg!: VariantConfig;
  private _detail = DEFAULT_DETAIL;
  private _styleEl: HTMLStyleElement;
  private _mover: HTMLDivElement;
  private _pop: HTMLDivElement;
  private _flip: HTMLDivElement;
  private _boomHost: HTMLDivElement;
  private _svg!: SVGSVGElement;
  private _signText!: SVGTextElement;

  constructor() {
    super();
    const sh = this.attachShadow({ mode: 'open' });
    sh.innerHTML =
      '<style></style><div id="mover"><div id="pop"><div id="flip"></div></div><div id="boomHost"></div></div>';
    this._styleEl = sh.querySelector('style')!;
    this._mover = sh.querySelector('#mover')!;
    this._pop = sh.querySelector('#pop')!;
    this._flip = sh.querySelector('#flip')!;
    this._boomHost = sh.querySelector('#boomHost')!;
    this._build();
  }

  connectedCallback(): void {
    this._applySize();
  }

  attributeChangedCallback(name: string): void {
    if (!this._flip) return;
    if (name === 'variant' || name === 'color') this._build();
    else this._applySize();
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
    this._styleEl.textContent = buildCSS(this._cfg);
    this._detail = detailFor(this.color);
    this._flip.innerHTML = buildSVG(this._cfg, this.color, this._detail);
    this._svg = this._flip.querySelector('svg')!;
    this._signText = this._flip.querySelector('#signText')!;
    this._setWordText(this._word);
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
    this._apply();
  }

  private _apply(): void {
    this._mover.style.transform = `translateX(${this._x - this._w / 2}px)`;
  }

  private _face(dir: number, instant?: boolean): void {
    if (instant) this._flip.style.transition = 'none';
    this._flip.style.transform = `scaleX(${dir})`;
    if (instant)
      requestAnimationFrame(() => {
        this._flip.style.transition = '';
      });
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

  /** Walk to x, facing the direction of travel. */
  async walkTo(x: number): Promise<void> {
    if (
      this._state === 'hidden' ||
      this._state === 'exploding' ||
      this._state === 'zombie'
    )
      return;
    const t = ++this._tok;
    if (Math.abs(x - this._x) < 2) {
      this._mode('idle', 'alive breathing');
      return;
    }
    this._face(x > this._x ? 1 : -1);
    this._mode('walking', 'alive walking');
    const sp = this.speed;
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
        const dir = Math.sign(x - this._x);
        this._x += dir * sp * dt;
        if (dir >= 0 ? this._x >= x : this._x <= x) {
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

  /** Stop and hold up a sign with the given word (max 14 chars, uppercased). */
  async showWord(word: string): Promise<void> {
    if (
      this._state === 'hidden' ||
      this._state === 'exploding' ||
      this._state === 'zombie'
    )
      return;
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

  /** Eyes turn to crosses, figure tilts over and wobbles quietly. */
  async zombie(): Promise<void> {
    if (this._state === 'hidden' || this._state === 'exploding') return;
    this._tok++;
    this._mode('zombie', 'zombie');
    await wait(600);
  }

  /** Panic, then explode into splinters and disappear. */
  async terminate(): Promise<void> {
    if (this._state === 'hidden' || this._state === 'exploding') return;
    const t = ++this._tok;
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
