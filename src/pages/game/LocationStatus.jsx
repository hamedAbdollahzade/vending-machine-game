import { GameNode } from '@/components/shared/GameNode.jsx';
import { strings } from '@/i18n/fa.js';
/** @typedef {{nodes:object,actions:object}} LocationStatusProps */
/** Presents the LocationStatus using the current interface snapshot. */
export function LocationStatus({ nodes }) {
  return (
    <GameNode as="div" id="location" model={nodes['location']}>
      <GameNode as="span" id="street" model={nodes['street']}>
        {strings.common.mashhad}
      </GameNode>
      <GameNode as="small" id="mode-label" model={nodes['mode-label']}>
        {strings.common.walking}
      </GameNode>
      <GameNode as="small" id="gps-status" hidden model={nodes['gps-status']}></GameNode>
    </GameNode>
  );
}
