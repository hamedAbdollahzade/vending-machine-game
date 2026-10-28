// Reads public/data/buildings.bin (written by scripts/build-buildings.mjs) into the same
// [height, x0, z0, x1, z1, …] arrays the OSM buildings in mellat.json use.
export function decodeBuildings(buffer) {
  const view = new DataView(buffer);
  const magic = String.fromCharCode(...new Uint8Array(buffer, 0, 4));
  if (magic !== 'RMB2') throw new Error(`unknown buildings file ${magic}`);
  const count = view.getUint32(4, true),
    minX = view.getFloat32(8, true),
    minZ = view.getFloat32(12, true),
    step = view.getFloat32(16, true);
  const buildings = new Array(count);
  let o = 20;
  for (let b = 0; b < count; b++) {
    const n = view.getUint8(o),
      height = view.getUint8(o + 1) * 0.5;
    o += 2;
    const building = new Array(1 + n * 2);
    building[0] = height;
    let qx = 0,
      qz = 0;
    for (let i = 0; i < n; i++, o += 4) {
      qx = i ? qx + view.getInt16(o, true) : view.getUint16(o, true);
      qz = i ? qz + view.getInt16(o + 2, true) : view.getUint16(o + 2, true);
      building[1 + i * 2] = minX + qx * step;
      building[2 + i * 2] = minZ + qz * step;
    }
    buildings[b] = building;
  }
  return buildings;
}
