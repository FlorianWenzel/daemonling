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

describe('variant data', () => {
  it('every variant has a body and eyes', () => {
    for (const [name, cfg] of Object.entries(VARIANTS)) {
      expect(cfg.body, name).toBeTruthy();
      expect(cfg.eyes, name).toBeTruthy();
      expect(cfg.headTop, name).toBeGreaterThan(0);
    }
  });
});
