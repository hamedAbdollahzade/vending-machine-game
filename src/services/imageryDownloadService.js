import { apiClient } from './apiClient.js';
/** Downloads an imagery source file for the optional map preparation script.
 * @param {string} url - External imagery endpoint from the script constants.
 * @returns {Promise<ArrayBuffer>} Source image bytes.
 */
export async function downloadImagery(url) {
  const response = await apiClient.get(url, {
    responseType: 'arraybuffer',
    headers: {
      'User-Agent': 'robot-market-game/1.0',
    },
  });
  return response.data;
}
