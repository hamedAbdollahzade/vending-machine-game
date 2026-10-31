import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { strings } from '@/i18n/fa.js';
import { COMPANY } from '@/config/company.js';
import { StartScreen } from './StartScreen.jsx';

afterEach(cleanup);
// jsdom has no modal dialogs; open and close them by toggling the attribute.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

/**
 * Renders the start screen with a spy for interface actions.
 * @returns {{emit: import('vitest').Mock}} The actions spy.
 */
function renderStartScreen() {
  const actions = { emit: vi.fn() };
  render(<StartScreen nodes={{ landing: { hidden: false } }} actions={actions} />);
  return actions;
}

describe('StartScreen', () => {
  it('starts each mode, sending real-world play through its safety notice', () => {
    const actions = renderStartScreen();
    const { modes } = strings.landing;
    fireEvent.click(screen.getByRole('button', { name: new RegExp(modes.offline.label) }));
    expect(actions.emit).toHaveBeenLastCalledWith('start', 'offline');
    fireEvent.click(screen.getByRole('button', { name: new RegExp(modes.products.label) }));
    expect(actions.emit).toHaveBeenLastCalledWith('start', 'products');
    fireEvent.click(screen.getByRole('button', { name: new RegExp(modes.real.label) }));
    expect(actions.emit).toHaveBeenLastCalledWith('real-mode');
  });

  it('opens company information in a sheet and closes it again', () => {
    renderStartScreen();
    fireEvent.click(screen.getByRole('button', { name: strings.landing.sections.contact }));
    const sheet = screen.getByRole('dialog', { name: strings.landing.sections.contact });
    expect(sheet).toHaveAttribute('open');
    expect(screen.getByRole('link', { name: COMPANY.contact.email })).toHaveAttribute(
      'href',
      `mailto:${COMPANY.contact.email}`,
    );
    fireEvent.click(screen.getByRole('button', { name: strings.landing.close }));
    expect(sheet).not.toHaveAttribute('open');
  });
});
