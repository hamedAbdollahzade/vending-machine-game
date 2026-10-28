import { GameNode } from '@/components/shared/GameNode.jsx';
/** @typedef {{nodes:object,actions:object}} PaymentPanelProps */
/** Presents the PaymentPanel view using plain models and semantic native elements.
 * @param {PaymentPanelProps} props - Interface snapshots and callbacks.
 * @returns {import('react').ReactElement} Game panel.
 */
export function PaymentPanel({ nodes, actions }) {
  return (
    <>
      <GameNode as="section" id="payment" hidden model={nodes['payment']}>
        <small>{'کارت‌خوان روبات مارکت'}</small>
        <GameNode as="h2" id="payment-title" model={nodes['payment-title']}></GameNode>
        <GameNode as="p" id="payment-step" model={nodes['payment-step']}></GameNode>
        <div className="actions">
          <GameNode
            as="button"
            id="swipe"
            type="button"
            disabled
            model={nodes['swipe']}
            onAction={() => actions.emit('swipe')}
          >
            {'کشیدن کارت · C'}
          </GameNode>
          <GameNode
            as="button"
            id="cancel-payment"
            type="button"
            className="ghost"
            model={nodes['cancel-payment']}
            onAction={() => actions.emit('cancel-payment')}
          >
            {'انصراف'}
          </GameNode>
        </div>
      </GameNode>
    </>
  );
}
