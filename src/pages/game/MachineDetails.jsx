import { GameNode } from '@/components/shared/GameNode.jsx';
import { ViewLists } from './ViewLists.jsx';
/** @typedef {{nodes:object,actions:object}} MachineDetailsProps */
/** Presents the MachineDetails using the current interface snapshot. */
export function MachineDetails({ nodes, actions }) {
  return (
    <GameNode as="div" id="machine-detail" hidden model={nodes['machine-detail']}>
      <GameNode as="h4" id="detail-name" model={nodes['detail-name']}></GameNode>
      <GameNode as="p" id="detail-address" model={nodes['detail-address']}></GameNode>
      <GameNode as="p" id="detail-meta" model={nodes['detail-meta']}></GameNode>
      <GameNode as="p" id="detail-products" model={nodes['detail-products']}></GameNode>
      <GameNode
        as="button"
        id="route-button"
        type="button"
        model={nodes['route-button']}
        onAction={() => actions.emit('route-button')}
      >
        {'مسیریابی تا اینجا'}
      </GameNode>
    </GameNode>
  );
}
