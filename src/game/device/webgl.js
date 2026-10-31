/**
 * Whether this browser can draw the 3D world. Creates a throwaway canvas and releases its context
 * straight away, so the check costs nothing once the answer is known.
 * @returns {boolean} True when a WebGL context is available.
 */
export function supportsWebgl() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}
