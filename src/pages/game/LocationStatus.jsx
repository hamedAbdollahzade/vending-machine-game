import { GameNode } from '@/components/shared/GameNode.jsx';
/** @typedef {{nodes:object,actions:object}} LocationStatusProps */
/** Presents the LocationStatus using the current interface snapshot. */
export function LocationStatus({ nodes }) {
  return (
    <GameNode as="div" id="location" model={nodes['location']}>
      <GameNode as="span" id="street" model={nodes['street']}>
        {'مشهد'}
      </GameNode>
      <GameNode as="small" id="mode-label" model={nodes['mode-label']}>
        {'پیاده'}
      </GameNode>
      <GameNode as="small" id="gps-status" hidden model={nodes['gps-status']}></GameNode>
    </GameNode>
  );
}
