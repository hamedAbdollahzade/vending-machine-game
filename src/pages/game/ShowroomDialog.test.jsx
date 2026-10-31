import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { strings } from '@/i18n/fa.js';
import { ShowroomDialog } from './ShowroomDialog.jsx';
afterEach(cleanup);
describe('showroom robot questions', () => {
  it('asks about the selected model and displays catalog data in rial', () => {
    const actions = { emit: vi.fn(), close: vi.fn() },
      nodes = { showroom: { modelId: 'rm-48', open: false } };
    render(<ShowroomDialog nodes={nodes} actions={actions} />);
    fireEvent.click(screen.getByRole('button', { name: 'روبات، قیمتش چنده؟', hidden: true }));
    expect(actions.emit).toHaveBeenCalledWith('showroom-question', {
      modelId: 'rm-48',
      topic: 'price',
    });
    expect(screen.getByText(/۵٬۴۸۰٬۰۰۰٬۰۰۰ ریال/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '۶۰ کانال', hidden: true }));
    expect(actions.emit).toHaveBeenCalledWith('showroom-select', 'rm-60');
  });

  it('sends a purchase request for the selected model once', () => {
    const actions = { emit: vi.fn(), close: vi.fn() };
    const { rerender } = render(
      <ShowroomDialog nodes={{ showroom: { modelId: 'rm-35' } }} actions={actions} />,
    );
    fireEvent.click(screen.getByRole('button', { name: strings.showroom.order, hidden: true }));
    expect(actions.emit).toHaveBeenCalledWith('showroom-order');
    rerender(
      <ShowroomDialog
        nodes={{ showroom: { modelId: 'rm-35', ordered: ['rm-35'] } }}
        actions={actions}
      />,
    );
    expect(
      screen.getByRole('button', { name: strings.showroom.ordered, hidden: true }),
    ).toBeDisabled();
    expect(
      screen.getByRole('link', { name: strings.showroom.contact, hidden: true }),
    ).toHaveAttribute('href', expect.stringMatching(/^tel:/));
  });
});
