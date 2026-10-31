import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/shared/Icon.jsx';
import { strings } from '@/i18n/fa.js';
import { MenuItem } from './MenuItem.jsx';

// Menu actions in display order: [element id, icon, label key, what a click does]. `emit` sends
// the id to the game runtime; `sheet` opens a HUD sheet; `fullscreen` is handled here. Items
// marked `contextual` stay hidden until the runtime shows them (products in the factory, camera
// and stable mode in real-world play).
const ITEMS = [
  ['menu-map', 'map', 'map', { emit: 'minimap-button' }],
  ['menu-missions', 'list', 'missions', { sheet: 'missions' }],
  ['menu-status', 'chart', 'status', { sheet: 'status' }],
  ['showroom-open', 'grid', 'products', { emit: 'showroom-open', contextual: true }],
  ['gps-toggle', 'pin', 'realWorld', { emit: 'gps-toggle' }],
  ['ar-toggle', 'camera', 'camera', { emit: 'ar-toggle', contextual: true }],
  ['stable-toggle', 'target', 'stable', { emit: 'stable-toggle', contextual: true }],
  ['sound', 'sound', 'sound', { emit: 'sound' }],
  ['quality', 'sliders', 'graphics', { emit: 'quality' }],
  ['minimap-toggle', 'compass', 'minimap', { emit: 'minimap-toggle' }],
  ['menu-fullscreen', 'expand', 'fullscreen', { fullscreen: true }],
  ['menu-help', 'help', 'help', { sheet: 'help' }],
  ['restart', 'refresh', 'restart', { emit: 'restart' }],
  ['menu-home', 'home', 'home', { emit: 'back-to-menu' }],
];

/**
 * Switches the page in or out of fullscreen.
 */
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}

/** @typedef {{nodes: object, actions: object, onOpenSheet: function}} FloatingMenuProps */
/**
 * The single floating menu button; it reveals every secondary action in a list and closes on a
 * second tap, a tap outside, Escape, or after choosing an action.
 * @param {FloatingMenuProps} props - Interface snapshots, actions and the sheet opener.
 * @returns {import('react').ReactElement} Menu.
 */
export function FloatingMenu({ nodes, actions, onOpenSheet }) {
  const [isOpen, setIsOpen] = useState(false);
  const root = useRef(null);
  const canFullscreen = Boolean(document.documentElement.requestFullscreen);

  /**
   * Runs a menu action and closes the menu.
   * @param {object} action - One of the ITEMS actions.
   */
  const handleSelect = (action) => {
    setIsOpen(false);
    if (action.emit) actions.emit(action.emit);
    if (action.sheet) onOpenSheet(action.sheet);
    if (action.fullscreen) toggleFullscreen();
  };

  // While open, close on a press outside the menu or on Escape; listeners go when it closes.
  useEffect(() => {
    if (!isOpen) return undefined;
    const handlePointer = (event) => !root.current?.contains(event.target) && setIsOpen(false);
    const handleKey = (event) => event.key === 'Escape' && setIsOpen(false);
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  return (
    <div ref={root} id="game-menu" className={isOpen ? 'open' : undefined}>
      <button
        type="button"
        id="menu-button"
        aria-label={isOpen ? strings.menu.close : strings.menu.open}
        aria-expanded={isOpen}
        aria-controls="menu-items"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Icon name={isOpen ? 'close' : 'menu'} />
      </button>
      <div id="menu-items" role="menu" aria-label={strings.menu.label} hidden={!isOpen}>
        {ITEMS.map(([id, icon, labelKey, action]) => (
          <MenuItem
            key={id}
            id={id}
            icon={icon}
            label={strings.menu[labelKey]}
            hiddenByDefault={Boolean(action.contextual)}
            model={action.fullscreen && !canFullscreen ? { hidden: true } : nodes[id]}
            onSelect={() => handleSelect(action)}
          />
        ))}
      </div>
    </div>
  );
}
