import * as THREE from 'three';

// Canvas texture that is redrawn once web fonts are ready, so Persian text never keeps a fallback font.
export function textTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const paint = () => {
    draw(canvas.getContext('2d'), width, height);
    texture.needsUpdate = true;
  };
  paint();
  document.fonts?.ready.then(paint);
  return texture;
}
