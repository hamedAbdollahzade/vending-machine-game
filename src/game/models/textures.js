import * as THREE from 'three';

// Canvas texture that is redrawn once web fonts are ready, so Persian text never keeps a fallback font.
/**
 * Runs the text texture operation for this subsystem.
 * @param {*} width - width.
 * @param {*} height - height.
 * @param {*} draw - draw.
 * @returns {*} Operation result, when applicable.
 */
export function textTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  /**
   * Runs the paint operation for this subsystem.

   * @returns {*} Operation result, when applicable.
   */
  const paint = () => {
    draw(canvas.getContext('2d'), width, height);
    texture.needsUpdate = true;
  };
  paint();
  document.fonts?.ready.then(paint);
  return texture;
}
