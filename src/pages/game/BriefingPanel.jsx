import { GameNode } from '@/components/shared/GameNode.jsx';
import { strings } from '@/i18n/fa.js';
import { robotFace } from '@/config/assets.js';
/** @typedef {{nodes:object,actions:object}} BriefingPanelProps */
/** Presents the BriefingPanel view using plain models and semantic native elements.
 * @param {BriefingPanelProps} props - Interface snapshots and callbacks.
 * @returns {import('react').ReactElement} Game panel.
 */
export function BriefingPanel({ nodes, actions }) {
  return (
    <>
      <GameNode as="section" id="briefing" model={nodes['briefing']}>
        <div className="brief-map">
          <GameNode as="canvas" id="iran" model={nodes['iran']} />
        </div>
        <div className="brief-panel">
          <img
            className="brief-robot"
            src={robotFace('front')}
            alt={strings.briefing.robotAlt}
            width="136"
            height="223"
          />
          <small className="tag">{strings.briefing.tag}</small>
          <h1>{strings.briefing.title}</h1>
          <p className="sub">{strings.briefing.subtitle}</p>
          <GameNode
            as="pre"
            id="brief-text"
            aria-live="polite"
            model={nodes['brief-text']}
          ></GameNode>
          <GameNode
            as="button"
            id="start-mission"
            type="button"
            model={nodes['start-mission']}
            onAction={() => actions.emit('start-mission')}
          >
            {strings.briefing.start}
          </GameNode>
          <div className="brief-actions">
            <GameNode
              as="button"
              id="real-mode"
              type="button"
              className="ghost"
              model={nodes['real-mode']}
              onAction={() => actions.emit('real-mode')}
            >
              {strings.briefing.realWorld}
            </GameNode>
            <GameNode
              as="button"
              id="install"
              type="button"
              className="ghost"
              hidden
              model={nodes['install']}
              onAction={() => actions.emit('install')}
            >
              {strings.briefing.install}
            </GameNode>
          </div>
          <p className="keys">{strings.briefing.keys}</p>
        </div>
      </GameNode>
    </>
  );
}
