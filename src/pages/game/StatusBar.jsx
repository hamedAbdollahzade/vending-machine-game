import { GameNode } from '@/components/shared/GameNode.jsx';
import { ViewLists } from './ViewLists.jsx';
/** @typedef {{nodes:object,actions:object}} StatusBarProps */
/** Presents the StatusBar using the current interface snapshot. */
export function StatusBar({ nodes }) {
  return (
    <GameNode as="div" id="status" model={nodes['status']}>
      <div className="stat">
        <small>{'بودجه'}</small>
        <GameNode as="strong" id="balance" model={nodes['balance']}>
          {'۵۰۰'}
        </GameNode>
        <span>{'هتومان'}</span>
      </div>
      <div className="stat">
        <small>{'ساعت'}</small>
        <GameNode as="strong" id="clock" model={nodes['clock']}>
          {'۰۸:۳۰'}
        </GameNode>
      </div>
      <GameNode as="div" className="stat" id="speed-stat" hidden model={nodes['speed-stat']}>
        <small>{'سرعت'}</small>
        <GameNode as="strong" id="speed" model={nodes['speed']}>
          {'۰'}
        </GameNode>
        <span>{'km/h'}</span>
      </GameNode>
    </GameNode>
  );
}
