import { LocationStatus } from './LocationStatus.jsx';
import { MissionList } from './MissionList.jsx';
import { StatusBar } from './StatusBar.jsx';
import { RankProgress } from './RankProgress.jsx';
import { GameToolbar } from './GameToolbar.jsx';
import { TouchControls } from './TouchControls.jsx';
import { GameNode } from '@/components/shared/GameNode.jsx';
import { ViewLists } from './ViewLists.jsx';
import { strings } from '@/i18n/fa.js';
/** @typedef {{nodes:object,actions:object}} GameHudProps */
/** Presents the GameHud view using plain models and semantic native elements.
 * @param {GameHudProps} props - Interface snapshots and callbacks.
 * @returns {import('react').ReactElement} Game panel.
 */
export function GameHud({ nodes, actions }) {
  return (
    <>
      <GameNode as="div" id="hud" hidden model={nodes['hud']}>
        <GameNode as="canvas" id="compass" width="560" height="44" model={nodes['compass']} />
        <GameNode
          as="button"
          id="minimap-button"
          type="button"
          aria-label={strings.hud.openMap}
          model={nodes['minimap-button']}
          onAction={() => actions.emit('minimap-button')}
        >
          <GameNode as="canvas" id="minimap" width="220" height="220" model={nodes['minimap']} />
          <span className="map-hint">{strings.hud.mapHint}</span>
        </GameNode>
        <LocationStatus nodes={nodes} actions={actions} />
        <MissionList nodes={nodes} actions={actions} />
        <GameNode as="div" id="waypoint" hidden model={nodes['waypoint']}>
          <i></i>
          <GameNode as="b" id="waypoint-name" model={nodes['waypoint-name']}></GameNode>
          <GameNode as="span" id="waypoint-distance" model={nodes['waypoint-distance']}></GameNode>
        </GameNode>
        <GameNode
          as="button"
          id="prompt"
          hidden
          type="button"
          aria-label={strings.hud.interact}
          model={nodes['prompt']}
          onAction={() => actions.emit('prompt')}
        ></GameNode>
        <GameNode as="div" id="subtitle" hidden model={nodes['subtitle']}>
          <GameNode as="img" id="subtitle-face" alt="" hidden model={nodes['subtitle-face']} />
          <GameNode as="b" id="subtitle-speaker" model={nodes['subtitle-speaker']}></GameNode>
          <GameNode as="span" id="subtitle-text" model={nodes['subtitle-text']}></GameNode>
        </GameNode>
        <GameNode as="div" id="awards" aria-live="polite" model={nodes['awards']}>
          <ViewLists
            id="awards"
            model={nodes['awards']}
            onAction={(name, value) => actions.emit(name, value)}
          />
        </GameNode>
        <GameNode as="div" id="banner" hidden model={nodes['banner']}>
          <ViewLists
            id="banner"
            model={nodes['banner']}
            onAction={(name, value) => actions.emit(name, value)}
          />
        </GameNode>
        <StatusBar nodes={nodes} actions={actions} />
        <RankProgress nodes={nodes} actions={actions} />
        <GameToolbar nodes={nodes} actions={actions} />
        <TouchControls nodes={nodes} actions={actions} />
        <GameNode as="div" id="crosshair" model={nodes['crosshair']}></GameNode>
        <GameNode as="small" id="attribution" model={nodes['attribution']}>
          {strings.app.osmCredit}
        </GameNode>
      </GameNode>
    </>
  );
}
