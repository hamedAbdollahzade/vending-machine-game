import { strings } from '@/i18n/fa.js';
import { StartIcon } from './StartIcon.jsx';

// The four ways into the game, in display order, with their icons.
const OPTIONS = [
  { mode: 'real', icon: 'pin' },
  { mode: 'offline', icon: 'play' },
  { mode: 'about', icon: 'building' },
  { mode: 'products', icon: 'grid' },
];

/** @typedef {{actions: object}} StartOptionsProps */
/**
 * Shows the main start buttons. Real-world play goes through the safety notice first.
 * @param {StartOptionsProps} props - Interface actions.
 * @returns {import('react').ReactElement} Button grid.
 */
export function StartOptions({ actions }) {
  /**
   * Starts the game in a mode.
   * @param {string} mode - Start mode.
   */
  const handleStart = (mode) =>
    mode === 'real' ? actions.emit('real-mode') : actions.emit('start', mode);

  return (
    <nav aria-label={strings.landing.modesLabel} className="grid grid-cols-2 gap-3">
      {OPTIONS.map(({ mode, icon }, index) => (
        <button
          key={mode}
          id={`start-${mode}`}
          type="button"
          onClick={() => handleStart(mode)}
          className={
            index < 2 ? 'start-option start-option-primary' : 'start-option start-option-secondary'
          }
        >
          <StartIcon name={icon} className="h-7 w-7 shrink-0" />
          <span className="grid text-start">
            <span className="font-bold">{strings.landing.modes[mode].label}</span>
            <span className="text-xs opacity-80">{strings.landing.modes[mode].hint}</span>
          </span>
        </button>
      ))}
    </nav>
  );
}
