import { vi } from 'vitest';
/** Provides the Canvas2D drawing surface needed to construct procedural assets in jsdom.
 * @returns {object} Restorable canvas mock; no GPU or network is used.
 */
export function stubCanvas() {
  const context = new Proxy(
    {
      measureText: () => ({
        width: 100,
      }),
      createLinearGradient: () => ({
        addColorStop() {},
      }),
    },
    {
      get(target, key) {
        return key in target ? target[key] : () => {};
      },
    },
  );
  return vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
}
