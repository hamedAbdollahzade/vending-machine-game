import { apiClient } from './apiClient.js';
const WORLD_FILES = {
  buildings: './data/buildings.bin',
  imagery: './imagery/index.json',
};

/** Loads optional world assets without preventing the OSM fallback on network failure.
 * @param {AbortSignal} signal - Cancels startup when the game unmounts.
 * @returns {Promise<Array>} Binary buildings and imagery index, or null fallbacks.
 */
export async function loadWorldFiles(signal) {
  const requests = [
    apiClient.get(WORLD_FILES.buildings, {
      responseType: 'arraybuffer',
      signal,
    }),
    apiClient.get(WORLD_FILES.imagery, {
      signal,
    }),
  ];
  const results = await Promise.allSettled(requests);
  return results.map((result) => (result.status === 'fulfilled' ? result.value.data : null));
}

/** Loads a tile through the common client; the caller owns the returned object URL.
 * @param {string} path - Local imagery path.
 * @param {AbortSignal} signal - Request cancellation.
 * @returns {Promise<string>} Temporary URL, to revoke after image decoding.
 */
export async function loadTileUrl(path, signal) {
  const response = await apiClient.get(path, {
    responseType: 'blob',
    signal,
  });
  return URL.createObjectURL(response.data);
}
