import { GameNode } from '@/components/shared/GameNode.jsx';
import { strings } from '@/i18n/fa.js';

/** @typedef {{nodes: object}} SpeedChipProps */
/**
 * Small speedometer, shown only while driving.
 * @param {SpeedChipProps} props - Interface snapshots.
 * @returns {import('react').ReactElement} Speed readout.
 */
export function SpeedChip({ nodes }) {
  return (
    <GameNode as="div" id="speed-stat" hidden model={nodes['speed-stat']}>
      <GameNode as="strong" id="speed" model={nodes.speed}>
        {strings.status.speedStart}
      </GameNode>
      <small>{strings.units.speed}</small>
    </GameNode>
  );
}
