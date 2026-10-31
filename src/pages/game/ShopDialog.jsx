import { GameNode } from '@/components/shared/GameNode.jsx';
import { ViewLists } from './ViewLists.jsx';
import { strings } from '@/i18n/fa.js';
/** @typedef {{nodes:object,actions:object}} ShopDialogProps */
/** Presents the ShopDialog view using plain models and semantic native elements.
 * @param {ShopDialogProps} props - Interface snapshots and callbacks.
 * @returns {import('react').ReactElement} Game panel.
 */
export function ShopDialog({ nodes, actions }) {
  return (
    <>
      <GameNode as="dialog" id="shop" model={nodes['shop']} onClose={() => actions.close('shop')}>
        <header>
          <div>
            <GameNode as="small" id="shop-category" model={nodes['shop-category']}></GameNode>
            <GameNode as="h2" id="shop-name" model={nodes['shop-name']}></GameNode>
            <GameNode as="p" id="shop-address" model={nodes['shop-address']}></GameNode>
          </div>
          <GameNode
            as="button"
            type="button"
            className="close"
            id="shop-close"
            aria-label={strings.shop.close}
            model={nodes['shop-close']}
            onAction={() => actions.emit('shop-close')}
          >
            {'✕'}
          </GameNode>
        </header>
        <GameNode as="p" id="shop-note" model={nodes['shop-note']}></GameNode>
        <GameNode as="div" id="products" model={nodes['products']}>
          <ViewLists
            id="products"
            model={nodes['products']}
            onAction={(name, value) => actions.emit(name, value)}
          />
        </GameNode>
        <p className="rate">{strings.shop.note}</p>
      </GameNode>
    </>
  );
}
