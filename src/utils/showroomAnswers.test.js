import { describe, it, expect } from 'vitest';
import { SHOWROOM_CATALOG } from '../constants/showroomCatalog.js';
import { showroomAnswer, formatRial } from './showroomAnswers.js';
import { createState } from '../game/economy/gameState.js';
describe('factory showroom catalog', () => {
  it('keeps the supplied channel counts and full rial prices', () => {
    expect(SHOWROOM_CATALOG.map((model) => [model.id, model.channels, model.priceNumeric])).toEqual(
      [
        ['rm-35', 35, 4680000000],
        ['rm-48', 48, 5480000000],
        ['rm-60', 60, 5980000000],
      ],
    );
  });
  it('answers each model accurately without mutating the game wallet or awarding a purchase', () => {
    const state = createState(),
      before = structuredClone(state);
    for (const model of SHOWROOM_CATALOG) {
      expect(showroomAnswer({ modelId: model.id, topic: 'price' })).toContain(
        formatRial(model.priceNumeric),
      );
      expect(showroomAnswer({ modelId: model.id, topic: 'features' })).toContain(model.description);
    }
    expect(state).toEqual(before);
    expect(showroomAnswer({ modelId: 'unknown', topic: 'price' })).toBeNull();
    expect(showroomAnswer({ modelId: 'rm-35', topic: 'unsupported' })).toBeNull();
  });
});
