import { describe, expect, it } from 'vitest';
import { mapLinks } from './mapLinks.js';

describe('mapLinks', () => {
  it('points both map sites at the same rounded position', () => {
    const links = mapLinks({ lat: 36.4501234567, lon: 59.4234567 });
    expect(links.osm).toBe(
      'https://www.openstreetmap.org/?mlat=36.450123&mlon=59.423457#map=17/36.450123/59.423457',
    );
    expect(links.google).toContain('query=36.450123,59.423457');
  });
});
