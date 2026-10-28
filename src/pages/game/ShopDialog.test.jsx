import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ViewLists } from './ViewLists.jsx';
import { PaymentPanel } from './PaymentPanel.jsx';
afterEach(cleanup);
describe('React purchase interface', () => {
  it('selects an affordable product and blocks unaffordable products', () => {
    const onAction = vi.fn();
    render(
      <ViewLists
        id="products"
        onAction={onAction}
        model={{
          items: [
            { id: 'water', name: 'آب معدنی', type: 'drink', cost: 15, price: 15 },
            { id: 'nuts', name: 'آجیل', type: 'snack', cost: 65, price: 65, blocked: 'funds' },
          ],
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /آب معدنی/ }));
    expect(onAction).toHaveBeenCalledWith('select-product', 'water');
    expect(screen.getByRole('button', { name: /آجیل/ })).toBeDisabled();
  });
  it('uses the payment ready state for the explicit swipe action', () => {
    const actions = { emit: vi.fn() },
      nodes = {
        payment: { hidden: false },
        swipe: { disabled: false },
        'payment-title': { text: 'آب معدنی' },
      };
    render(<PaymentPanel nodes={nodes} actions={actions} />);
    fireEvent.click(screen.getByRole('button', { name: /کشیدن کارت/ }));
    expect(actions.emit).toHaveBeenCalledWith('swipe');
    fireEvent.click(screen.getByRole('button', { name: 'انصراف' }));
    expect(actions.emit).toHaveBeenCalledWith('cancel-payment');
  });
});
