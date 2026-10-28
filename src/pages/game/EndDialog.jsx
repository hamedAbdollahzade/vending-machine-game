import { GameNode } from '@/components/shared/GameNode.jsx';
import { ViewLists } from './ViewLists.jsx';
/** @typedef {{nodes:object,actions:object}} EndDialogProps */
/** Presents the EndDialog view using plain models and semantic native elements.
 * @param {EndDialogProps} props - Interface snapshots and callbacks.
 * @returns {import('react').ReactElement} Game panel.
 */
export function EndDialog({ nodes, actions }) {
  return (
    <>
      <GameNode as="dialog" id="end" model={nodes['end']} onClose={() => actions.close('end')}>
        <GameNode as="small" id="end-tag" model={nodes['end-tag']}>
          {'پایان عملیات'}
        </GameNode>
        <GameNode as="h2" id="end-title" model={nodes['end-title']}></GameNode>
        <GameNode as="p" id="end-text" model={nodes['end-text']}></GameNode>
        <GameNode as="ul" id="end-stats" model={nodes['end-stats']}>
          <ViewLists
            id="end-stats"
            model={nodes['end-stats']}
            onAction={(name, value) => actions.emit(name, value)}
          />
        </GameNode>
        <div className="actions">
          <GameNode
            as="button"
            id="again"
            type="button"
            model={nodes['again']}
            onAction={() => actions.emit('again')}
          >
            {'عملیات دوباره'}
          </GameNode>
          <GameNode
            as="button"
            id="continue"
            type="button"
            className="ghost"
            model={nodes['continue']}
            onAction={() => actions.emit('continue')}
          >
            {'ادامهٔ گشت در شهر'}
          </GameNode>
        </div>
      </GameNode>
    </>
  );
}
