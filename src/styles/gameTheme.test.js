import { describe, it, expect } from 'vitest';
import { gameTheme } from './gameTheme.js';

/**
 * Collects every CSS value in the theme, including those inside media blocks.
 * @param {object} rules - Theme rules keyed by selector or at-rule.
 * @returns {string[]} All declaration values.
 */
function allValues(rules) {
  return Object.values(rules).flatMap((body) =>
    Object.values(body).flatMap((value) =>
      typeof value === 'object' ? allValues({ value }) : [value],
    ),
  );
}

describe('game theme', () => {
  it('uses no negated var(), which browsers drop as invalid', () => {
    expect(allValues(gameTheme).filter((value) => String(value).includes('-var('))).toEqual([]);
  });

  it('keeps the phone rank bar at the top instead of stretching it to full height', () => {
    expect(gameTheme['@media (max-width: 760px)']['#rank']).toMatchObject({ bottom: 'auto' });
  });

  it('keeps the landscape phone layout as a top-level media block', () => {
    expect(gameTheme['@media (max-height: 520px)']?.['#minimap-button']).toBeDefined();
    expect(gameTheme['@media (max-width: 760px)']['@media (max-height: 520px)']).toBeUndefined();
  });

  it('lets the start screen scroll so its buttons stay reachable on short screens', () => {
    expect(gameTheme['#landing']['overflow-y']).toBe('auto');
  });

  it('keeps start screen buttons large enough to tap', () => {
    expect(gameTheme['.start-option']['min-height']).toBe('var(--game-token-77)');
    expect(gameTheme['.start-chip']['min-height']).toBe('var(--game-token-74)');
  });
});
