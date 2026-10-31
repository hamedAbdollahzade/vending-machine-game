import { GameNode } from '@/components/shared/GameNode.jsx';
import { strings } from '@/i18n/fa.js';
/** @typedef {{nodes:object,actions:object}} RankProgressProps */
/** Presents the RankProgress using the current interface snapshot. */
export function RankProgress({ nodes }) {
  return (
    <GameNode as="div" id="rank" model={nodes['rank']}>
      <GameNode as="b" id="rank-name" model={nodes['rank-name']}>
        {strings.status.rankStart}
      </GameNode>
      <GameNode as="span" id="xp" model={nodes['xp']}>
        {strings.status.xpStart}
      </GameNode>
      <div className="bar">
        <GameNode as="i" id="xp-bar" model={nodes['xp-bar']}></GameNode>
      </div>
    </GameNode>
  );
}
