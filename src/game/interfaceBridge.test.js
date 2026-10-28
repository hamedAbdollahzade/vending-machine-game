import { afterEach, describe, it, expect, vi } from 'vitest';
import { createAppStore } from '../store/index.js';
import { createInterfaceBridge } from './interfaceBridge.js';
afterEach(() => vi.useRealTimers());
describe('renderer to React bridge', () => {
  it('batches UI changes, retains synchronous pause state and serializes economic progress', () => {
    vi.useFakeTimers();
    const store = createAppStore(),
      ui = createInterfaceBridge(store);
    ui.open('shop');
    expect(ui.read('shop').open).toBe(true);
    expect(store.getState().interface.nodes.shop).toBeUndefined();
    vi.advanceTimersByTime(100);
    expect(store.getState().interface.nodes.shop.open).toBe(true);
    ui.publishGame({ balance: 465, purchases: [], missionsDone: [], xp: 350, minutes: 510 });
    expect(store.getState().game.balance).toBe(465);
    ui.dispose();
  });
  it('runs registered commands and does not publish stale UI after disposal', () => {
    vi.useFakeTimers();
    const store = createAppStore(),
      ui = createInterfaceBridge(store),
      handler = vi.fn();
    ui.on('select-product', handler);
    ui.emit('select-product', 'water');
    expect(handler).toHaveBeenCalledWith('water');
    ui.patch('balance', { text: 'test' });
    ui.dispose();
    vi.runAllTimers();
    expect(store.getState().interface.nodes.balance).toBeUndefined();
    ui.emit('select-product', 'water');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
