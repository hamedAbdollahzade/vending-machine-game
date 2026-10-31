import { apiClient } from './apiClient.js';
import { SATELLITE_GROUND } from '../constants/world.js';
import { ASSETS } from '../config/assets.js';

const WORLD_FILES = ASSETS.world;

/** Loads optional world assets without preventing the OSM fallback on network failure.
 * @param {AbortSignal} signal - Cancels startup when the game unmounts.
 * @returns {Promise<Array>} Binary buildings and imagery index (null while SATELLITE_GROUND is off), or null fallbacks.
 */
export async function loadWorldFiles(signal) {
  const requests = [
    apiClient.get(WORLD_FILES.buildings, {
      responseType: 'arraybuffer',
      signal,
    }),
    // Without the satellite ground the tile index is not needed, so it is not downloaded.
    SATELLITE_GROUND
      ? apiClient.get(WORLD_FILES.imagery, {
          signal,
        })
      : Promise.resolve({ data: null }),
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
