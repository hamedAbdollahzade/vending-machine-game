import { GameNode } from '@/components/shared/GameNode.jsx';
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
            src="./robot/front.webp"
            alt="روبات راهنمای روبات مارکت"
            width="136"
            height="223"
          />
          <small className="tag">{'عملیات ۰۱ · خراسان رضوی'}</small>
          <h1>{'عملیات مشهد'}</h1>
          <p className="sub">{'روبات مارکت · شکار دستگاه‌های وندینگ'}</p>
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
            {'شروع عملیات'}
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
              {'📍 بازی در دنیای واقعی (GPS)'}
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
              {'⬇ نصب بازی روی گوشی'}
            </GameNode>
          </div>
          <p className="keys">
            {
              'حرکت: W A S D · دویدن: Shift · دوربین: ماوس · سوار و پیاده شدن: F · خرید: E · نقشه: M'
            }
          </p>
        </div>
      </GameNode>
    </>
  );
}
