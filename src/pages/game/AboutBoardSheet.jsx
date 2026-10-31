import { InfoSheet } from './startScreen/InfoSheet.jsx';

/** @typedef {{nodes: object, actions: object}} AboutBoardSheetProps */
/**
 * Full text of the information board the player is reading in the factory yard. Reuses the start
 * screen's company sections, so boards and the landing page always say the same thing.
 * @param {AboutBoardSheetProps} props - Interface snapshots and actions.
 * @returns {import('react').ReactElement} Sheet.
 */
export function AboutBoardSheet({ nodes, actions }) {
  const board = nodes['about-board'] ?? {};
  return (
    <InfoSheet
      id="about-board"
      section={board.open ? board.topic : null}
      onClose={() => actions.emit('about-board-close')}
    />
  );
}
