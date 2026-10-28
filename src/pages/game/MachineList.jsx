import { GameNode } from '@/components/shared/GameNode.jsx';
import { ViewLists } from './ViewLists.jsx';
/** @typedef {{nodes:object,actions:object}} MachineListProps */
/** Presents the MachineList using the current interface snapshot. */
export function MachineList({ nodes, actions }) {
  return (
    <GameNode as="ul" id="machine-list" model={nodes['machine-list']}>
      <ViewLists
        id="machine-list"
        model={nodes['machine-list']}
        onAction={(name, value) => actions.emit(name, value)}
      />
    </GameNode>
  );
}
