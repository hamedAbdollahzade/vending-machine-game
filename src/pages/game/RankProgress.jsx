import { GameNode } from '@/components/shared/GameNode.jsx';
/** @typedef {{nodes:object,actions:object}} RankProgressProps */
/** Presents the RankProgress using the current interface snapshot. */
export function RankProgress({ nodes }) {
  return (
    <GameNode as="div" id="rank" model={nodes['rank']}>
      <GameNode as="b" id="rank-name" model={nodes['rank-name']}>
        {'تازه‌وارد'}
      </GameNode>
      <GameNode as="span" id="xp" model={nodes['xp']}>
        {'۰ XP'}
      </GameNode>
      <div className="bar">
        <GameNode as="i" id="xp-bar" model={nodes['xp-bar']}></GameNode>
      </div>
    </GameNode>
  );
}
