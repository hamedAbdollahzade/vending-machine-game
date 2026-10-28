import { describe, it, expect, vi, afterEach } from 'vitest';
afterEach(() => {
  vi.restoreAllMocks();
  history.replaceState({}, '', '/');
});
describe('world asset service', () => {
  it('resolves a Pages repository directory without inheriting query parameters', async () => {
    history.replaceState({}, '', '/vending-machine-game/?debug');
    vi.resetModules();
    const { apiClient } = await import('./apiClient.js');
    expect(apiClient.defaults.baseURL).toBe(`${location.origin}/vending-machine-game/`);
  });
  it('retains the optional-data fallback and passes cancellation to both requests', async () => {
    const { apiClient } = await import('./apiClient.js');
    const { loadWorldFiles } = await import('./worldService.js');
    const get = vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('offline'));
    const controller = new AbortController();
    expect(await loadWorldFiles(controller.signal)).toEqual([null, null]);
    expect(get).toHaveBeenCalledWith('./data/buildings.bin', {
      responseType: 'arraybuffer',
      signal: controller.signal,
    });
    expect(get).toHaveBeenCalledWith('./imagery/index.json', { signal: controller.signal });
  });
});
