import { GameNode } from '@/components/shared/GameNode.jsx';
import { strings } from '@/i18n/fa.js';
import { robotFace } from '@/config/assets.js';

/** @typedef {{nodes: object, actions: object}} GpsFallbackDialogProps */
/**
 * Explains why location failed and offers offline play from Park Mellat instead.
 * @param {GpsFallbackDialogProps} props - Interface snapshots and actions.
 * @returns {import('react').ReactElement} Dialog.
 */
export function GpsFallbackDialog({ nodes, actions }) {
  return (
    <GameNode
      as="dialog"
      id="gps-fallback"
      aria-labelledby="gps-fallback-title"
      className="info-sheet"
      model={nodes['gps-fallback']}
      onClose={() => actions.emit('gps-fallback-close')}
    >
      <img src={robotFace('serious')} alt="" width="72" height="68" className="float-end ms-3" />
      <h2 id="gps-fallback-title" className="mb-2 text-lg font-bold">
        {strings.gpsFallback.title}
      </h2>
      <GameNode as="p" id="gps-fallback-text" model={nodes['gps-fallback-text']} />
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          className="start-option start-option-primary"
          onClick={() => actions.emit('gps-offline')}
        >
          {strings.gpsFallback.offline}
        </button>
        <button
          type="button"
          className="start-chip"
          onClick={() => actions.emit('gps-fallback-close')}
        >
          {strings.gpsFallback.close}
        </button>
      </div>
    </GameNode>
  );
}
