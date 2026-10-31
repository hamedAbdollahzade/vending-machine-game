import { GameNode } from '@/components/shared/GameNode.jsx';
import { strings } from '@/i18n/fa.js';
/** @typedef {{nodes:object,actions:object}} StatusBarProps */
/** Presents the StatusBar using the current interface snapshot. */
export function StatusBar({ nodes }) {
  return (
    <GameNode as="div" id="status" model={nodes['status']}>
      <div className="stat">
        <small>{strings.status.budget}</small>
        <GameNode as="strong" id="balance" model={nodes['balance']}>
          {strings.status.budgetStart}
        </GameNode>
        <span>{strings.units.hetomanName}</span>
      </div>
      <div className="stat">
        <small>{strings.status.clock}</small>
        <GameNode as="strong" id="clock" model={nodes['clock']}>
          {strings.status.clockStart}
        </GameNode>
      </div>
      <GameNode as="div" className="stat" id="speed-stat" hidden model={nodes['speed-stat']}>
        <small>{strings.status.speed}</small>
        <GameNode as="strong" id="speed" model={nodes['speed']}>
          {strings.status.speedStart}
        </GameNode>
        <span>{'km/h'}</span>
      </GameNode>
    </GameNode>
  );
}
