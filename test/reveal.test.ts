import { beforeEach, describe, expect, it } from 'vitest';
import { RevealDaemonling, type RevealDeckApi } from '../src/reveal';

type Listener = (event?: unknown) => void;

function makeDeck(ready = true) {
  const root = document.createElement('div');
  root.className = 'reveal';
  const slides = document.createElement('div');
  slides.className = 'slides';
  root.appendChild(slides);
  document.body.appendChild(root);
  const listeners = new Map<string, Listener[]>();
  const deck: RevealDeckApi & {
    emit(type: string, event?: unknown): void;
    slides: HTMLElement;
  } = {
    slides,
    getRevealElement: () => root,
    getSlidesElement: () => slides,
    getCurrentSlide: () => slides.querySelector('section'),
    isReady: () => ready,
    on(type, fn) {
      listeners.set(type, [...(listeners.get(type) ?? []), fn]);
    },
    emit(type, event) {
      for (const fn of listeners.get(type) ?? []) fn(event);
    },
  };
  return deck;
}

function section(deck: { slides: HTMLElement }, attrs: Record<string, string> = {}) {
  const s = document.createElement('section');
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  deck.slides.appendChild(s);
  return s;
}

const settle = () => new Promise((r) => setTimeout(r, 20));

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('RevealDaemonling', () => {
  it('appends a configured sprite to the slides element on init', () => {
    const deck = makeDeck();
    section(deck);
    const plugin = RevealDaemonling({ size: 70, variant: 'daemon', color: '#7053D6' });
    expect(plugin.sprite).toBeNull();
    plugin.init(deck);
    const sprite = plugin.sprite!;
    expect(sprite.parentElement).toBe(deck.slides);
    expect(sprite.size).toBe(70);
    expect(sprite.variant).toBe('daemon');
    expect(sprite.color).toBe('#7053D6');
    expect(sprite.style.zIndex).toBe('30');
  });

  it('runs the current slide script on init when the deck is ready', async () => {
    const deck = makeDeck(true);
    section(deck, { 'data-dl': 'spawn 150' });
    const plugin = RevealDaemonling();
    plugin.init(deck);
    await settle();
    expect(plugin.sprite!.state).toBe('idle');
    expect(plugin.sprite!.x).toBe(150);
  });

  it('runs multi-command scripts sequentially on slidechanged', async () => {
    const deck = makeDeck();
    const plugin = RevealDaemonling();
    plugin.init(deck);
    const slide = section(deck, { 'data-dl': 'spawn 100; walk 160 10000; word MUTEX' });
    deck.emit('slidechanged', { currentSlide: slide });
    await settle();
    const p = plugin.sprite!;
    expect(p.x).toBe(160);
    expect(p.state).toBe('showing');
    expect(p.shadowRoot!.querySelector('#signText')!.textContent).toBe('MUTEX');
  });

  it('despawns on script-less slides, keeps on data-dl-keep', async () => {
    const deck = makeDeck();
    const plugin = RevealDaemonling();
    plugin.init(deck);
    await plugin.run('spawn 100');
    const keep = section(deck, { 'data-dl-keep': '' });
    deck.emit('slidechanged', { currentSlide: keep });
    expect(plugin.sprite!.state).toBe('idle');
    const bare = section(deck);
    deck.emit('slidechanged', { currentSlide: bare });
    expect(plugin.sprite!.state).toBe('hidden');
  });

  it('a slide change cancels the running script', async () => {
    const deck = makeDeck();
    const plugin = RevealDaemonling();
    plugin.init(deck);
    const slow = section(deck, { 'data-dl': 'spawn 100; wait 5000; word LATE' });
    deck.emit('slidechanged', { currentSlide: slow });
    await settle();
    deck.emit('slidechanged', { currentSlide: section(deck) });
    await settle();
    expect(plugin.sprite!.state).toBe('hidden');
  });

  it('fragments trigger scripts and undo scripts', async () => {
    const deck = makeDeck();
    const plugin = RevealDaemonling();
    plugin.init(deck);
    await plugin.run('spawn 100');
    const frag = document.createElement('span');
    frag.setAttribute('data-dl', 'word FORK');
    frag.setAttribute('data-dl-undo', 'hide');
    deck.emit('fragmentshown', { fragment: frag });
    await settle();
    expect(plugin.sprite!.state).toBe('showing');
    deck.emit('fragmenthidden', { fragment: frag });
    await settle();
    expect(plugin.sprite!.state).toBe('idle');
  });

  it('variant/color/look commands work and unknown commands only warn', async () => {
    const deck = makeDeck();
    const plugin = RevealDaemonling();
    plugin.init(deck);
    await plugin.run('spawn 100; variant blob; color #1E7A4F; look up; frobnicate');
    const p = plugin.sprite!;
    expect(p.variant).toBe('blob');
    expect(p.color).toBe('#1E7A4F');
    expect(p.state).toBe('idle');
  });

  it('respects a custom attribute name and autoDespawn:false', async () => {
    const deck = makeDeck();
    const plugin = RevealDaemonling({ attribute: 'data-sprite', autoDespawn: false });
    plugin.init(deck);
    const slide = section(deck, { 'data-sprite': 'spawn 120' });
    deck.emit('slidechanged', { currentSlide: slide });
    await settle();
    expect(plugin.sprite!.x).toBe(120);
    deck.emit('slidechanged', { currentSlide: section(deck) });
    expect(plugin.sprite!.state).toBe('idle');
  });
});
