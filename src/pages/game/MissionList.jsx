import { GameNode } from '@/components/shared/GameNode.jsx';
import { ViewLists } from './ViewLists.jsx';
/** @typedef {{nodes:object,actions:object}} MissionListProps */
/** Presents the MissionList using the current interface snapshot. */
export function MissionList({ nodes, actions }) {
  return (
    <GameNode as="aside" id="objectives" model={nodes['objectives']}>
      <h2>{'مأموریت‌ها'}</h2>
      <GameNode as="ol" id="mission-list" model={nodes['mission-list']}>
        <ViewLists
          id="mission-list"
          model={nodes['mission-list']}
          onAction={(name, value) => actions.emit(name, value)}
        />
      </GameNode>
    </GameNode>
  );
}
