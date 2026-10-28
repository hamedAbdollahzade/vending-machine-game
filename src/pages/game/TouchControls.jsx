import { GameNode } from '@/components/shared/GameNode.jsx';
import { ViewLists } from './ViewLists.jsx';
/** @typedef {{nodes:object,actions:object}} TouchControlsProps */
/** Presents the TouchControls using the current interface snapshot. */
export function TouchControls({ nodes, actions }) {
  return (
    <GameNode as="div" id="touch" hidden model={nodes['touch']}>
      <GameNode as="div" id="stick" model={nodes['stick']}>
        <i></i>
      </GameNode>
      <div className="touch-buttons">
        <GameNode
          as="button"
          type="button"
          data-key="f"
          id="touch-f"
          model={nodes['touch-f']}
          onAction={() => actions.emit('touch-f')}
        >
          {'F'}
        </GameNode>
        <GameNode
          as="button"
          type="button"
          data-key="e"
          id="touch-e"
          model={nodes['touch-e']}
          onAction={() => actions.emit('touch-e')}
        >
          {'E'}
        </GameNode>
        <GameNode
          as="button"
          type="button"
          data-key="shift"
          id="touch-shift"
          model={nodes['touch-shift']}
          onAction={() => actions.emit('touch-shift')}
        >
          {'دویدن'}
        </GameNode>
      </div>
    </GameNode>
  );
}
