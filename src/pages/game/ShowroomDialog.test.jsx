import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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
});
