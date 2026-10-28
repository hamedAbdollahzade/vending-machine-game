// Local tangent-plane projection around the playable Park Mellat area.
// World axes: +x east, -z north, 1 unit = 1 metre.
export const ORIGIN = {
  lat: 36.315,
  lon: 59.539,
};
const METRES_PER_DEG_LAT = 110574;
const METRES_PER_DEG_LON = 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180);
/**
 * Runs the to local operation for this subsystem.
 * @param {*} lat - lat.
 * @param {*} lon - lon.
 * @returns {*} Operation result, when applicable.
 */
export function toLocal(lat, lon) {
  return {
    x: (lon - ORIGIN.lon) * METRES_PER_DEG_LON,
    z: (ORIGIN.lat - lat) * METRES_PER_DEG_LAT,
  };
}
/**
 * Runs the to lat lon operation for this subsystem.
 * @param {*} x - x.
 * @param {*} z - z.
 * @returns {*} Operation result, when applicable.
 */
export function toLatLon(x, z) {
  return {
    lat: ORIGIN.lat - z / METRES_PER_DEG_LAT,
    lon: ORIGIN.lon + x / METRES_PER_DEG_LON,
  };
}

// Compass bearing in degrees (0 = north, 90 = east) of a world-space direction.
/**
 * Runs the bearing operation for this subsystem.
 * @param {*} dx - dx.
 * @param {*} dz - dz.
 * @returns {*} Operation result, when applicable.
 */
export function bearing(dx, dz) {
  return ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
}
/**
 * Runs the format distance operation for this subsystem.
 * @param {*} metres - metres.
 * @returns {*} Operation result, when applicable.
 */
export function formatDistance(metres) {
  return metres < 1000
    ? `${Math.round(metres).toLocaleString('fa-IR')} متر`
    : `${(Math.round(metres / 100) / 10).toLocaleString('fa-IR')} کیلومتر`;
}
