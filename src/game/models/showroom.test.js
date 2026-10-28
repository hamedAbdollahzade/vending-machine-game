import { describe, it, expect, afterEach } from 'vitest';
import { Scene } from 'three';
import { stubCanvas } from '../../tests/canvasStub.js';
import { FACTORY } from '../../constants/locations.js';
let mock;
afterEach(() => mock?.mockRestore());
describe('procedural factory and sample construction', () => {
  it('constructs the factory, human family and three distinct channel-count samples', async () => {
    mock = stubCanvas();
    const { createFactory } = await import('./factory.js');
    const { createFamily } = await import('./characters.js');
    const { createShowroom } = await import('./showroom.js');
    const scene = new Scene(),
      factory = createFactory(scene),
      family = createFamily(),
      showroom = createShowroom(scene);
    expect(factory.talks.length).toBeGreaterThan(5);
    expect(factory.footprints.length).toBeGreaterThan(10);
    expect(showroom.samples.map((sample) => sample.machine.group.userData.channels)).toEqual([
      35, 48, 60,
    ]);
    for (const sample of showroom.samples) {
      const slots = [];
      sample.machine.group.traverse((object) => {
        if (object.userData.channel) slots.push(object.userData.channel);
      });
      expect(slots.length).toBe(sample.model.channels);
      expect(new Set(slots).size).toBe(sample.model.channels);
    }
    for (const sample of showroom.samples)
      expect(showroom.nearest(sample.front)?.model.id).toBe(sample.model.id);
    family.update({ dt: 0.016, time: 1, gait: 1, moving: true });
    family.group.updateMatrixWorld(true);
    family.group.traverse((object) =>
      expect(object.matrixWorld.elements.every(Number.isFinite)).toBe(true),
    );
    factory.update(1, 0.016, { x: FACTORY.center.x, y: 2, z: FACTORY.center.z });
    showroom.update({
      player: showroom.samples[0].front,
      time: 1,
      dt: 0.016,
      enabled: true,
      talking: true,
    });
  });
});
