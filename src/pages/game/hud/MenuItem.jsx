import { GameNode } from '@/components/shared/GameNode.jsx';
import { Icon } from '@/components/shared/Icon.jsx';

/** @typedef {{id: string, icon: string, label: string, model?: object, hiddenByDefault?: boolean,
 * onSelect: function}} MenuItemProps */
/**
 * One floating-menu action. Runtime state (hidden, pressed, disabled) comes from `model`; the
 * label always comes from the strings file so every item keeps its icon and short name.
 * @param {MenuItemProps} props - Element id, icon, label, runtime snapshot, whether it stays hidden
 * until the runtime shows it, and click handler.
 * @returns {import('react').ReactElement} Menu button.
 */
export function MenuItem({ id, icon, label, model = {}, hiddenByDefault = false, onSelect }) {
  const { hidden, pressed, disabled } = model;
  return (
    <GameNode
      as="button"
      id={id}
      type="button"
      role="menuitem"
      className="menu-item"
      hidden={hiddenByDefault}
      model={{ hidden, pressed, disabled }}
      onAction={onSelect}
    >
      <Icon name={icon} className="h-5 w-5 shrink-0" />
      <span>{label}</span>
    </GameNode>
  );
}
