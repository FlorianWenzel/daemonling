import type { Daemonling } from './element';
import { register, TAG_NAME } from './index';

/**
 * reveal.js plugin. Registers one persistent sprite inside the deck's
 * `.slides` element (so it scales with the presentation) and drives it from
 * `data-dl` attributes:
 *
 *   Reveal.initialize({ plugins: [RevealDaemonling({ size: 70 })] });
 *
 *   <section data-dl="spawn 200; walk 700; word MUTEX">…</section>
 *   <section data-dl-keep>sprite stays where it is</section>
 *   <span class="fragment" data-dl="celebrate" data-dl-undo="startle">…</span>
 *
 * Script syntax: commands separated by `;`, arguments by spaces —
 *   spawn [x] · walk x [speed] · word TEXT · hide · wave · jump ·
 *   point left|right [ms] · think [ms] · sleep · wake · startle · freeze ·
 *   unfreeze · celebrate · fork · look dir · zombie · terminate · despawn ·
 *   wait ms · variant name · color value
 *
 * On every slide change the previous script is cancelled; slides without
 * `data-dl` despawn the sprite unless they carry `data-dl-keep` (or
 * `autoDespawn: false` is set).
 */

/** The small slice of the reveal.js API the plugin relies on. */
export interface RevealDeckApi {
  getRevealElement(): HTMLElement;
  getSlidesElement?(): HTMLElement;
  getCurrentSlide(): HTMLElement | null;
  isReady?(): boolean;
  on(type: string, listener: (event?: unknown) => void): void;
}

export interface RevealDaemonlingOptions {
  size?: number;
  variant?: string;
  color?: string;
  speed?: number;
  signStyle?: 'sign' | 'bubble';
  /** CSS bottom offset inside the slides element (default "0px"). */
  bottom?: string;
  zIndex?: number;
  /** Attribute holding scripts (default "data-dl"); "-keep"/"-undo" suffixes derive from it. */
  attribute?: string;
  /** Despawn on slides without a script (default true). */
  autoDespawn?: boolean;
}

export interface RevealDaemonlingPlugin {
  id: string;
  init(deck: RevealDeckApi): void;
  /** The sprite element, available after init. */
  readonly sprite: Daemonling | null;
  /** Run a script imperatively, cancelling whatever is currently running. */
  run(script: string): Promise<void>;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const num = (s: string | undefined): number | undefined => {
  const v = parseFloat(s ?? '');
  return Number.isFinite(v) ? v : undefined;
};

export function RevealDaemonling(
  options: RevealDaemonlingOptions = {},
): RevealDaemonlingPlugin {
  const attr = options.attribute ?? 'data-dl';
  let sprite: Daemonling | null = null;
  let tok = 0;

  async function runScript(script: string, t: number): Promise<void> {
    for (const raw of script.split(';')) {
      const p = sprite;
      if (t !== tok || !p) return;
      const line = raw.trim();
      if (!line) continue;
      const [cmd, ...args] = line.split(/\s+/);
      const rest = line.slice(cmd.length).trim();
      switch (cmd) {
        case 'spawn': await p.spawn(num(args[0])); break;
        case 'walk': await p.walkTo(num(args[0]) ?? p.x, { speed: num(args[1]) }); break;
        case 'word':
        case 'show': await p.showWord(rest); break;
        case 'hide': await p.hideWord(); break;
        case 'wave': await p.wave(); break;
        case 'jump': await p.jump(); break;
        case 'point': await p.point(args[0] ?? 'right', num(args[1])); break;
        case 'think': await p.think(num(args[0])); break;
        case 'sleep': await p.sleep(); break;
        case 'wake': await p.wake(); break;
        case 'startle': await p.startle(); break;
        case 'freeze': await p.freeze(); break;
        case 'unfreeze': await p.unfreeze(); break;
        case 'celebrate': await p.celebrate(); break;
        case 'fork': await p.fork(); break;
        case 'look': p.look(args[0] ?? 'center'); break;
        case 'zombie': await p.zombie(); break;
        case 'terminate': await p.terminate(); break;
        case 'despawn': p.despawn(); break;
        case 'wait': await wait(num(args[0]) ?? 500); break;
        case 'variant': if (args[0]) p.variant = args[0]; break;
        case 'color': if (args[0]) p.color = args[0]; break;
        default:
          console.warn(`daemonling/reveal: unknown command "${cmd}"`);
      }
    }
  }

  function onSlide(slide: HTMLElement | null): void {
    const t = ++tok;
    const script = slide?.getAttribute(attr);
    if (script) {
      void runScript(script, t);
      return;
    }
    if (options.autoDespawn !== false && !slide?.hasAttribute(`${attr}-keep`))
      sprite?.despawn();
  }

  return {
    id: 'daemonling',

    get sprite(): Daemonling | null {
      return sprite;
    },

    run(script: string): Promise<void> {
      return runScript(script, ++tok);
    },

    init(deck: RevealDeckApi): void {
      register();
      sprite = document.createElement(TAG_NAME) as Daemonling;
      if (options.size != null) sprite.setAttribute('size', String(options.size));
      if (options.variant) sprite.setAttribute('variant', options.variant);
      if (options.color) sprite.setAttribute('color', options.color);
      if (options.speed != null) sprite.setAttribute('speed', String(options.speed));
      if (options.signStyle) sprite.setAttribute('sign-style', options.signStyle);
      sprite.style.bottom = options.bottom ?? '0px';
      sprite.style.zIndex = String(options.zIndex ?? 30);
      const host =
        deck.getSlidesElement?.() ??
        deck.getRevealElement().querySelector<HTMLElement>('.slides') ??
        deck.getRevealElement();
      host.appendChild(sprite);

      deck.on('slidechanged', (e) =>
        onSlide((e as { currentSlide?: HTMLElement }).currentSlide ?? null),
      );
      deck.on('fragmentshown', (e) => {
        const s = (e as { fragment?: HTMLElement }).fragment?.getAttribute(attr);
        if (s) void runScript(s, ++tok);
      });
      deck.on('fragmenthidden', (e) => {
        const s = (e as { fragment?: HTMLElement }).fragment?.getAttribute(
          `${attr}-undo`,
        );
        if (s) void runScript(s, ++tok);
      });
      if (deck.isReady?.()) onSlide(deck.getCurrentSlide());
      else deck.on('ready', () => onSlide(deck.getCurrentSlide()));
    },
  };
}

export default RevealDaemonling;
