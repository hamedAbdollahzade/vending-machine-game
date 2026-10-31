/**
 * Builds links that open a position in public map sites.
 * @param {{lat: number, lon: number}} position - Latitude and longitude in degrees.
 * @returns {{osm: string, google: string}} OpenStreetMap and Google Maps URLs.
 */
export function mapLinks({ lat, lon }) {
  const latText = lat.toFixed(6),
    lonText = lon.toFixed(6);
  return {
    osm: `https://www.openstreetmap.org/?mlat=${latText}&mlon=${lonText}#map=17/${latText}/${lonText}`,
    google: `https://www.google.com/maps/search/?api=1&query=${latText},${lonText}`,
  };
}
