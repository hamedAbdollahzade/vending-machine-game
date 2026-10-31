import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { strings } from '@/i18n/fa.js';
import { COMPANY } from '@/config/company.js';
import { MachineCard } from './MachineCard.jsx';

afterEach(cleanup);
// jsdom has no modal dialogs; open them by setting the attribute.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
});

/**
 * Renders the card for the 60-channel model with an actions spy.
 * @param {object} card - Extra card fields.
 * @returns {{emit: import('vitest').Mock}} Actions spy.
 */
function renderCard(card = {}) {
  const actions = { emit: vi.fn() };
  const nodes = { 'machine-card': { open: true, modelId: 'rm-60', site: 'زمین ورزشی', ...card } };
  render(<MachineCard nodes={nodes} actions={actions} />);
  return actions;
}

describe('MachineCard', () => {
  it('shows the installed model with its site and specs, and sends an order request', () => {
    const actions = renderCard();
    const product = COMPANY.products.find((p) => p.id === 'rm-60');
    expect(screen.getByRole('heading', { name: product.name })).toBeInTheDocument();
    expect(screen.getByText('زمین ورزشی')).toBeInTheDocument();
    expect(screen.getByText(product.highlights[0])).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: strings.machineCard.order }));
    expect(actions.emit).toHaveBeenCalledWith('machine-order');
  });

  it('confirms an order and does not let it be sent twice', () => {
    renderCard({ ordered: true });
    expect(screen.getByRole('button', { name: strings.machineCard.ordered })).toBeDisabled();
  });
});
