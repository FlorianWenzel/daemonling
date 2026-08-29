import { beforeEach, describe, expect, it } from 'vitest';
import { Daemonling, TAG_NAME, VARIANTS } from '../src/index';

function create(attrs: Record<string, string> = {}): Daemonling {
  const el = document.createElement(TAG_NAME) as Daemonling;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('registration', () => {
  it('defines <daemonling-sprite>', () => {
    expect(customElements.get(TAG_NAME)).toBe(Daemonling);
  });

  it('exposes all variants', () => {
    expect(Daemonling.variants).toEqual([
      'classic',
      'chip',
      'blob',
      'terminal',
      'daemon',
      'packet',
      'cursor',
    ]);
  });
});

describe('attributes', () => {
  it('has sensible defaults', () => {
    const el = create();
    expect(el.size).toBe(90);
    expect(el.speed).toBe(300);
    expect(el.variant).toBe('classic');
    expect(el.color).toBe('#04102B');
    expect(el.state).toBe('hidden');
  });

  it('falls back to classic for unknown variants', () => {
    const el = create({ variant: 'nonsense' });
    expect(el.variant).toBe('classic');
  });

  it('resolves legacy German variant aliases', () => {
    expect(create({ variant: 'klassiker' }).variant).toBe('classic');
    expect(create({ variant: 'paket' }).variant).toBe('packet');
  });

  it('scales speed with size', () => {
    const el = create({ size: '180', speed: '300' });
    expect(el.speed).toBe(600);
  });

  it('rebuilds the SVG when the variant changes', () => {
    const el = create();
    const before = el.shadowRoot!.querySelector('#flip')!.innerHTML;
    el.variant = 'daemon';
    const after = el.shadowRoot!.querySelector('#flip')!.innerHTML;
    expect(after).not.toBe(before);
    expect(after).toContain('shadow');
  });
});

describe('lifecycle', () => {
  it('spawn → idle at the given x', async () => {
    const el = create();
    await el.spawn(300);
    expect(el.state).toBe('idle');
    expect(el.x).toBe(300);
  });

  it('walkTo moves to the target and returns to idle', async () => {
    const el = create();
    await el.spawn(100);
    await el.walkTo(160);
    expect(el.x).toBe(160);
    expect(el.state).toBe('idle');
  });

  it('walkTo is a no-op while hidden', async () => {
    const el = create();
    await el.walkTo(500);
    expect(el.state).toBe('hidden');
    expect(el.x).toBe(0);
  });

  it('showWord uppercases and truncates to 14 chars', async () => {
    const el = create();
    await el.spawn(100);
    await el.showWord('mutual exclusion zone');
    expect(el.state).toBe('showing');
    const text = el.shadowRoot!.querySelector('#signText')!;
    expect(text.textContent).toBe('MUTUAL EXCLUSI');
  });

  it('hideWord only acts in showing state', async () => {
    const el = create();
    await el.spawn(100);
    await el.hideWord();
    expect(el.state).toBe('idle');
    await el.showWord('FORK');
    await el.hideWord();
    expect(el.state).toBe('idle');
  });

  it('zombie blocks walking', async () => {
    const el = create();
    await el.spawn(100);
    await el.zombie();
    expect(el.state).toBe('zombie');
    await el.walkTo(400);
    expect(el.x).toBe(100);
  });

  it('terminate ends hidden', async () => {
    const el = create();
    await el.spawn(100);
    await el.terminate();
    expect(el.state).toBe('hidden');
  });

  it('despawn hides immediately', async () => {
    const el = create();
    await el.spawn(100);
    el.despawn();
    expect(el.state).toBe('hidden');
  });
});

describe('actions', () => {
  it('wave returns to idle', async () => {
    const el = create();
    await el.spawn(100);
    await el.wave();
    expect(el.state).toBe('idle');
  });

  it('jump returns to idle', async () => {
    const el = create();
    await el.spawn(100);
    await el.jump();
    expect(el.state).toBe('idle');
  });

  it('point accepts English and German directions', async () => {
    const el = create();
    await el.spawn(100);
    await el.point('left', 50);
    expect(el.state).toBe('idle');
    await el.point('rechts', 50);
    expect(el.state).toBe('idle');
  });

  it('think shows and removes the bubble', async () => {
    const el = create();
    await el.spawn(100);
    const p = el.think(120);
    await new Promise((r) => setTimeout(r, 30));
    expect(el.shadowRoot!.querySelector('.dl-think')).toBeTruthy();
    await p;
    expect(el.shadowRoot!.querySelector('.dl-think')).toBeNull();
    expect(el.state).toBe('idle');
  });

  it('sleep blocks walking until wake', async () => {
    const el = create();
    await el.spawn(100);
    await el.sleep();
    expect(el.state).toBe('sleeping');
    await el.walkTo(400);
    expect(el.x).toBe(100);
    await el.wake();
    expect(el.state).toBe('idle');
    await el.walkTo(160);
    expect(el.x).toBe(160);
  });

  it('freeze blocks actions until unfreeze', async () => {
    const el = create();
    await el.spawn(100);
    await el.freeze();
    expect(el.state).toBe('frozen');
    await el.wave();
    expect(el.state).toBe('frozen');
    await el.unfreeze();
    expect(el.state).toBe('idle');
  });

  it('startle ends idle', async () => {
    const el = create();
    await el.spawn(100);
    await el.startle();
    expect(el.state).toBe('idle');
  });

  it('celebrate ends idle', async () => {
    const el = create();
    await el.spawn(100);
    await el.celebrate();
    expect(el.state).toBe('idle');
  });

  it('fork returns a spawned clone with copied attributes', async () => {
    const el = create({ variant: 'blob', color: '#7053D6' });
    await el.spawn(100);
    const clone = await el.fork();
    expect(clone).not.toBeNull();
    expect(clone!.tagName.toLowerCase()).toBe(TAG_NAME);
    expect(clone!.variant).toBe('blob');
    expect(clone!.color).toBe('#7053D6');
    expect(clone!.state).toBe('idle');
    expect(clone!.x).toBeGreaterThan(100);
  });

  it('fork is refused while hidden', async () => {
    const el = create();
    expect(await el.fork()).toBeNull();
  });

  it('walkTo honors a per-walk speed override', async () => {
    const el = create();
    await el.spawn(100);
    const t0 = performance.now();
    await el.walkTo(200, { speed: 10000 });
    expect(el.x).toBe(200);
    expect(performance.now() - t0).toBeLessThan(500);
  });
});

describe('sign', () => {
  it('defaults to the sign style with lime background', () => {
    const el = create();
    expect(el.signStyle).toBe('sign');
    expect(el.signColor).toBe('#D9FF3C');
  });

  it('bubble style switches default background and rebuilds', () => {
    const el = create({ 'sign-style': 'bubble' });
    expect(el.signStyle).toBe('bubble');
    expect(el.signColor).toBe('#FFFFFF');
    expect(el.shadowRoot!.querySelector('#signFlip rect')!.getAttribute('rx')).toBe('17');
  });

  it('accepts the legacy German style name "blase"', () => {
    const el = create({ 'sign-style': 'blase' });
    expect(el.signStyle).toBe('bubble');
  });

  it('applies custom sign colors', () => {
    const el = create({ 'sign-color': '#FFFFFF', 'sign-text-color': '#FF4E6A' });
    const rect = el.shadowRoot!.querySelector('#signFlip rect')!;
    expect(rect.getAttribute('fill')).toBe('#FFFFFF');
    expect(el.shadowRoot!.querySelector('#signText')!.getAttribute('fill')).toBe('#FF4E6A');
  });
});

describe('variant data', () => {
  it('every variant has a body and eyes', () => {
    for (const [name, cfg] of Object.entries(VARIANTS)) {
      expect(cfg.body, name).toBeTruthy();
      expect(cfg.eyes, name).toBeTruthy();
      expect(cfg.headTop, name).toBeGreaterThan(0);
    }
  });
});
