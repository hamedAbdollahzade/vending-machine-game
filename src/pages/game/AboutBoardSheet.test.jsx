import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { COMPANY } from '@/config/company.js';
import { strings } from '@/i18n/fa.js';
import { AboutBoardSheet } from './AboutBoardSheet.jsx';

afterEach(cleanup);
// jsdom has no modal dialogs; open and close them by toggling the attribute.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
});

describe('AboutBoardSheet', () => {
  it('shows the board topic in full and reports closing', () => {
    const actions = { emit: vi.fn() };
    const nodes = { 'about-board': { open: true, topic: 'contact' } };
    render(<AboutBoardSheet nodes={nodes} actions={actions} />);
    expect(screen.getByRole('heading', { name: strings.landing.sections.contact })).toBeVisible();
    expect(screen.getByText(COMPANY.contact.email)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: strings.landing.close }));
    expect(actions.emit).toHaveBeenCalledWith('about-board-close');
  });

  it('renders nothing inside while closed', () => {
    render(<AboutBoardSheet nodes={{}} actions={{ emit: vi.fn() }} />);
    expect(screen.queryByText(COMPANY.contact.email)).not.toBeInTheDocument();
  });
});
