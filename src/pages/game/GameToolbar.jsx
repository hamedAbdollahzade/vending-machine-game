import { GameNode } from '@/components/shared/GameNode.jsx';
import { strings } from '@/i18n/fa.js';
/** @typedef {{nodes:object,actions:object}} GameToolbarProps */
/** Presents the GameToolbar using the current interface snapshot. */
export function GameToolbar({ nodes, actions }) {
  return (
    <GameNode as="div" id="toolbar" model={nodes['toolbar']}>
      <GameNode
        as="button"
        id="showroom-open"
        type="button"
        hidden
        model={nodes['showroom-open']}
        onAction={() => actions.emit('showroom-open')}
      >
        {strings.toolbar.showroom}
      </GameNode>
      <GameNode
        as="button"
        id="gps-toggle"
        type="button"
        model={nodes['gps-toggle']}
        onAction={() => actions.emit('gps-toggle')}
      >
        {strings.toolbar.realWorld}
      </GameNode>
      <GameNode
        as="button"
        id="ar-toggle"
        type="button"
        hidden
        model={nodes['ar-toggle']}
        onAction={() => actions.emit('ar-toggle')}
      >
        {strings.toolbar.camera}
      </GameNode>
      <GameNode
        as="button"
        id="stable-toggle"
        type="button"
        className="on"
        hidden
        model={nodes['stable-toggle']}
        onAction={() => actions.emit('stable-toggle')}
      >
        {strings.toolbar.stableOn}
      </GameNode>
      <GameNode
        as="button"
        id="sound"
        type="button"
        aria-pressed="false"
        model={nodes['sound']}
        onAction={() => actions.emit('sound')}
      >
        {strings.toolbar.soundOff}
      </GameNode>
      <GameNode
        as="button"
        id="quality"
        type="button"
        model={nodes['quality']}
        onAction={() => actions.emit('quality')}
      >
        {strings.toolbar.graphics}
      </GameNode>
      <GameNode
        as="button"
        id="restart"
        type="button"
        model={nodes['restart']}
        onAction={() => actions.emit('restart')}
      >
        {strings.toolbar.restart}
      </GameNode>
    </GameNode>
  );
}
