import { GameNode } from '@/components/shared/GameNode.jsx';
import { Icon } from '@/components/shared/Icon.jsx';
import { strings } from '@/i18n/fa.js';

/** @typedef {{nodes: object, onOpen: function}} ObjectiveChipProps */
/**
 * Compact current-objective indicator: an arrow towards the target (relative to the camera),
 * the objective in one line and its distance. Tapping it opens the mission list.
 * @param {ObjectiveChipProps} props - Interface snapshots and the mission sheet opener.
 * @returns {import('react').ReactElement} Objective button.
 */
export function ObjectiveChip({ nodes, onOpen }) {
  return (
    <GameNode
      as="button"
      type="button"
      id="objective"
      hidden
      aria-label={strings.objective.open}
      model={{ hidden: nodes.objective?.hidden ?? true }}
      onAction={onOpen}
    >
      <GameNode as="span" id="objective-arrow" model={nodes['objective-arrow']}>
        <Icon name="arrow" className="h-5 w-5" />
      </GameNode>
      <span className="grid min-w-0 text-start">
        <small className="text-primary">{strings.objective.label}</small>
        <GameNode as="b" id="objective-title" model={nodes['objective-title']} />
      </span>
      <GameNode as="span" id="objective-distance" model={nodes['objective-distance']} />
    </GameNode>
  );
}
