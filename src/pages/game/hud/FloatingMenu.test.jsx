import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { strings } from '@/i18n/fa.js';
import { FloatingMenu } from './FloatingMenu.jsx';

afterEach(cleanup);

/**
 * Renders the menu with spies for runtime actions and sheets.
 * @param {object} nodes - Interface snapshots.
 * @returns {{actions: {emit: import('vitest').Mock}, onOpenSheet: import('vitest').Mock}} Spies.
 */
function renderMenu(nodes = {}) {
  const actions = { emit: vi.fn() },
    onOpenSheet = vi.fn();
  render(<FloatingMenu nodes={nodes} actions={actions} onOpenSheet={onOpenSheet} />);
  return { actions, onOpenSheet };
}

/** Opens the menu with its button. */
const openMenu = () => fireEvent.click(screen.getByRole('button', { name: strings.menu.open }));

describe('FloatingMenu', () => {
  it('reveals the actions on tap and hides them again on a second tap', () => {
    renderMenu();
    expect(screen.queryByRole('menu')).toBeNull();
    openMenu();
    expect(screen.getByRole('menu')).toBeVisible();
    expect(screen.getByRole('button', { name: strings.menu.close })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: strings.menu.close }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('runs an action and closes, and closes on Escape or a tap outside', () => {
    const { actions, onOpenSheet } = renderMenu();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: strings.menu.home }));
    expect(actions.emit).toHaveBeenCalledWith('back-to-menu');
    expect(screen.queryByRole('menu')).toBeNull();
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: strings.menu.missions }));
    expect(onOpenSheet).toHaveBeenCalledWith('missions');
    openMenu();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    openMenu();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('keeps real-world only items hidden until the game shows them', () => {
    renderMenu({ 'ar-toggle': { hidden: false } });
    openMenu();
    expect(screen.getByRole('menuitem', { name: strings.menu.camera })).toBeVisible();
    expect(screen.queryByRole('menuitem', { name: strings.menu.stable })).toBeNull();
  });
});
