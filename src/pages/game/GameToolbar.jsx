import { GameNode } from '@/components/shared/GameNode.jsx';
import { ViewLists } from './ViewLists.jsx';
/** @typedef {{nodes:object,actions:object}} GameToolbarProps */
/** Presents the GameToolbar using the current interface snapshot. */
export function GameToolbar({ nodes, actions }) {
  return (
    <GameNode as="div" id="toolbar" model={nodes['toolbar']}>
      <GameNode
        as="button"
        id="gps-toggle"
        type="button"
        model={nodes['gps-toggle']}
        onAction={() => actions.emit('gps-toggle')}
      >
        {'📍 دنیای واقعی'}
      </GameNode>
      <GameNode
        as="button"
        id="ar-toggle"
        type="button"
        hidden
        model={nodes['ar-toggle']}
        onAction={() => actions.emit('ar-toggle')}
      >
        {'📷 دوربین'}
      </GameNode>
      <GameNode
        as="button"
        id="stable-toggle"
        type="button"
        className="on"
        hidden
        model={nodes['stable-toggle']}
        onAction={() => actions.emit('stable-toggle')}
      >
        {'🎯 پایدار: روشن'}
      </GameNode>
      <GameNode
        as="button"
        id="sound"
        type="button"
        aria-pressed="false"
        model={nodes['sound']}
        onAction={() => actions.emit('sound')}
      >
        {'صدا: خاموش'}
      </GameNode>
      <GameNode
        as="button"
        id="quality"
        type="button"
        model={nodes['quality']}
        onAction={() => actions.emit('quality')}
      >
        {'گرافیک'}
      </GameNode>
      <GameNode
        as="button"
        id="restart"
        type="button"
        model={nodes['restart']}
        onAction={() => actions.emit('restart')}
      >
        {'شروع دوباره'}
      </GameNode>
    </GameNode>
  );
}
