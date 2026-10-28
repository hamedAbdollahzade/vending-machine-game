import { GameNode } from '@/components/shared/GameNode.jsx';
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
        <h2>{'نصب روی آیفون'}</h2>
        <ol>
          <li>
            {'در Safari دکمهٔ '}
            <b>{'Share'}</b>
            {' (مربع با فلش رو به بالا) را بزنید.'}
          </li>
          <li>
            {'گزینهٔ '}
            <b>{'Add to Home Screen'}</b>
            {' را انتخاب کنید.'}
          </li>
          <li>
            {'روبات مارکت مثل یک اپ روی صفحهٔ اصلی گوشی شما قرار می‌گیرد و آفلاین هم اجرا می‌شود.'}
          </li>
        </ol>
        <GameNode
          as="button"
          type="button"
          id="ios-close"
          model={nodes['ios-close']}
          onAction={() => actions.emit('ios-close')}
        >
          {'متوجه شدم'}
        </GameNode>
      </GameNode>
    </>
  );
}
