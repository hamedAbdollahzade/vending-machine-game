import { GameNode } from '@/components/shared/GameNode.jsx';
import { strings } from '@/i18n/fa.js';
import { robotFace } from '@/config/assets.js';
/** @typedef {{nodes:object,actions:object}} RealIntroDialogProps */
/** Presents the RealIntroDialog view using plain models and semantic native elements.
 * @param {RealIntroDialogProps} props - Interface snapshots and callbacks.
 * @returns {import('react').ReactElement} Game panel.
 */
export function RealIntroDialog({ nodes, actions }) {
  return (
    <>
      <GameNode
        as="dialog"
        id="real-intro"
        model={nodes['real-intro']}
        onClose={() => actions.close('real-intro')}
      >
        <img src={robotFace('serious')} alt="" width="72" height="68" />
        <h2>{strings.realIntro.title}</h2>
        <p>{strings.realIntro.body}</p>
        <ul>
          {strings.realIntro.safety.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div className="actions">
          <GameNode
            as="button"
            type="button"
            id="real-go"
            model={nodes['real-go']}
            onAction={() => actions.emit('real-go')}
          >
            {strings.realIntro.accept}
          </GameNode>
          <GameNode
            as="button"
            type="button"
            id="real-cancel"
            className="ghost"
            model={nodes['real-cancel']}
            onAction={() => actions.emit('real-cancel')}
          >
            {strings.common.cancel}
          </GameNode>
        </div>
      </GameNode>
    </>
  );
}
