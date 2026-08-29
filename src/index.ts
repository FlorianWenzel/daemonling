import { Daemonling } from './element';

export { Daemonling } from './element';
export type { DaemonlingState, Direction, LookDirection } from './element';
export type { SignOptions, SignStyle } from './svg';
export { VARIANTS, VARIANT_ALIASES } from './variants';
export type { VariantConfig } from './variants';

export const TAG_NAME = 'daemonling-sprite';

/** Register <daemonling-sprite> (idempotent). Called automatically on import. */
export function register(tagName: string = TAG_NAME): void {
  if (typeof customElements === 'undefined') return;
  if (customElements.get(tagName)) return;
  customElements.define(tagName, Daemonling);
}

register();

declare global {
  interface HTMLElementTagNameMap {
    'daemonling-sprite': Daemonling;
  }
}
