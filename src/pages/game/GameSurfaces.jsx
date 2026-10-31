import { GameNode } from '@/components/shared/GameNode.jsx';
/** @typedef {{nodes:object,actions:object}} GameSurfacesProps */
/** Presents the GameSurfaces view using plain models and semantic native elements.
 * @param {GameSurfacesProps} props - Interface snapshots and callbacks.
 * @returns {import('react').ReactElement} Game panel.
 */
export function GameSurfaces({ nodes }) {
  return (
    <>
      <GameNode
        as="video"
        id="camera"
        playsInline
        muted
        autoPlay
        hidden
        model={nodes['camera']}
      ></GameNode>
      <GameNode as="canvas" id="world" model={nodes['world']} />
    </>
  );
}
