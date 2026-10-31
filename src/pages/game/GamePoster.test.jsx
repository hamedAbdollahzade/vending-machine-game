import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { COMPANY } from '@/config/company.js';
import { strings } from '@/i18n/fa.js';
import { GamePoster } from './GamePoster.jsx';
import { GameLoader } from './GameLoader.jsx';

afterEach(cleanup);

describe('GamePoster', () => {
  it('starts the game from the enter button when 3D works', () => {
    const onEnter = vi.fn();
    render(<GamePoster canRender onEnter={onEnter} />);
    expect(screen.getByText(COMPANY.name)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: strings.poster.enter }));
    expect(onEnter).toHaveBeenCalled();
  });

  it('explains missing 3D support and shows the company information instead', () => {
    render(<GamePoster canRender={false} onEnter={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent(strings.poster.noWebgl);
    expect(screen.queryByRole('button', { name: strings.poster.enter })).not.toBeInTheDocument();
    expect(screen.getByText(COMPANY.about.history)).toBeInTheDocument();
    expect(screen.getByText(COMPANY.contact.email)).toBeInTheDocument();
  });
});

describe('GameLoader', () => {
  it('shows start-up progress as a percentage', () => {
    render(<GameLoader nodes={{ loading: { progress: 0.42 } }} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
  });
});
