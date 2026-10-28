import { GameNode } from '@/components/shared/GameNode.jsx';
/** @typedef {{nodes:object,actions:object}} UpdateNoticeProps */
/** Presents the UpdateNotice view using plain models and semantic native elements.
 * @param {UpdateNoticeProps} props - Interface snapshots and callbacks.
 * @returns {import('react').ReactElement} Game panel.
 */
export function UpdateNotice({ nodes, actions }) {
  return (
    <>
      <GameNode as="div" id="update-toast" hidden model={nodes['update-toast']}>
        {'نسخهٔ جدید بازی آماده است '}
        <GameNode
          as="button"
          type="button"
          id="update-reload"
          model={nodes['update-reload']}
          onAction={() => actions.emit('update-reload')}
        >
          {'به‌روزرسانی'}
        </GameNode>
      </GameNode>
    </>
  );
}
