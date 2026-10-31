import { GameNode } from '@/components/shared/GameNode.jsx';
import { strings } from '@/i18n/fa.js';
/** @typedef {{nodes:object,actions:object}} InstallDialogProps */
/** Presents the InstallDialog view using plain models and semantic native elements.
 * @param {InstallDialogProps} props - Interface snapshots and callbacks.
 * @returns {import('react').ReactElement} Game panel.
 */
export function InstallDialog({ nodes, actions }) {
  return (
    <>
      <GameNode
        as="dialog"
        id="ios-install"
        model={nodes['ios-install']}
        onClose={() => actions.close('ios-install')}
      >
        <h2>{strings.install.title}</h2>
        <ol>
          <li>
            {strings.install.shareBefore}
            <b>{'Share'}</b>
            {strings.install.shareAfter}
          </li>
          <li>
            {strings.install.addBefore}
            <b>{'Add to Home Screen'}</b>
            {strings.install.addAfter}
          </li>
          <li>{strings.install.note}</li>
        </ol>
        <GameNode
          as="button"
          type="button"
          id="ios-close"
          model={nodes['ios-close']}
          onAction={() => actions.emit('ios-close')}
        >
          {strings.common.gotIt}
        </GameNode>
      </GameNode>
    </>
  );
}
