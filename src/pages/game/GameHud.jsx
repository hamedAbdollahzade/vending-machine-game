import { useState } from 'react';
import { GameNode } from '@/components/shared/GameNode.jsx';
import { strings } from '@/i18n/fa.js';
import { TouchControls } from './TouchControls.jsx';
import { ViewLists } from './ViewLists.jsx';
import { FloatingMenu } from './hud/FloatingMenu.jsx';
import { ObjectiveChip } from './hud/ObjectiveChip.jsx';
import { SpeedChip } from './hud/SpeedChip.jsx';
import { HudSheets } from './hud/HudSheets.jsx';

/** @typedef {{nodes: object, actions: object}} GameHudProps */
/**
 * Minimal in-game interface: the floating menu, the current objective and the controls are the
 * only things always on screen; everything else is contextual (prompt, dialogue, awards, speed
 * while driving) or lives in a sheet behind the menu.
 * @param {GameHudProps} props - Interface snapshots and actions.
 * @returns {import('react').ReactElement} HUD.
 */
export function GameHud({ nodes, actions }) {
  const [sheet, setSheet] = useState(null);
  const emit = (name, value) => actions.emit(name, value);

  return (
    <GameNode as="div" id="hud" hidden model={nodes.hud}>
      <FloatingMenu nodes={nodes} actions={actions} onOpenSheet={setSheet} />
      <ObjectiveChip nodes={nodes} onOpen={() => setSheet('missions')} />
      <GameNode as="small" id="gps-status" hidden model={nodes['gps-status']} />
      <GameNode
        as="button"
        id="minimap-button"
        type="button"
        hidden
        aria-label={strings.hud.openMap}
        model={nodes['minimap-button']}
        onAction={() => actions.emit('minimap-button')}
      >
        <GameNode as="canvas" id="minimap" width="220" height="220" model={nodes.minimap} />
      </GameNode>
      <GameNode as="div" id="waypoint" hidden model={nodes.waypoint}>
        <i></i>
        <GameNode as="b" id="waypoint-name" model={nodes['waypoint-name']} />
        <GameNode as="span" id="waypoint-distance" model={nodes['waypoint-distance']} />
      </GameNode>
      <GameNode
        as="button"
        id="prompt"
        hidden
        type="button"
        aria-label={strings.hud.interact}
        model={nodes.prompt}
        onAction={() => actions.emit('prompt')}
      />
      <GameNode as="div" id="subtitle" hidden model={nodes.subtitle}>
        <GameNode as="img" id="subtitle-face" alt="" hidden model={nodes['subtitle-face']} />
        <GameNode as="b" id="subtitle-speaker" model={nodes['subtitle-speaker']} />
        <GameNode as="span" id="subtitle-text" model={nodes['subtitle-text']} />
      </GameNode>
      <GameNode as="div" id="awards" aria-live="polite" model={nodes.awards}>
        <ViewLists id="awards" model={nodes.awards} onAction={emit} />
      </GameNode>
      <GameNode as="div" id="banner" hidden model={nodes.banner}>
        <ViewLists id="banner" model={nodes.banner} onAction={emit} />
      </GameNode>
      <SpeedChip nodes={nodes} />
      <TouchControls nodes={nodes} actions={actions} />
      <GameNode as="div" id="crosshair" model={nodes.crosshair} />
      <GameNode as="small" id="attribution" model={nodes.attribution}>
        {strings.app.osmCredit}
      </GameNode>
      <HudSheets sheet={sheet} nodes={nodes} actions={actions} onClose={() => setSheet(null)} />
    </GameNode>
  );
}
