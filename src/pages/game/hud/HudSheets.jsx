import { GameNode } from '@/components/shared/GameNode.jsx';
import { Sheet } from '@/components/shared/Sheet.jsx';
import { strings } from '@/i18n/fa.js';
import { ViewLists } from '../ViewLists.jsx';

/**
 * Mission list with the active one highlighted and finished ones ticked.
 * @param {{nodes: object, actions: object}} props - Interface snapshots and actions.
 * @returns {import('react').ReactElement} Ordered list.
 */
function MissionsBody({ nodes, actions }) {
  return (
    <ol id="mission-list" className="mission-list">
      <ViewLists
        id="mission-list"
        model={nodes['mission-list']}
        onAction={(name, value) => actions.emit(name, value)}
      />
    </ol>
  );
}

/**
 * Budget, game clock, rank and experience.
 * @param {{nodes: object}} props - Interface snapshots.
 * @returns {import('react').ReactElement} Status rows.
 */
function StatusBody({ nodes }) {
  const rows = [
    [strings.status.budget, 'balance', strings.status.budgetStart, strings.units.hetomanName],
    [strings.status.clock, 'clock', strings.status.clockStart, ''],
    [strings.status.rank, 'rank-name', strings.status.rankStart, ''],
    [strings.status.xp, 'xp', strings.status.xpStart, ''],
  ];
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3">
      {rows.map(([label, id, fallback, unit]) => (
        <div key={id} className="contents">
          <dt className="opacity-70">{label}</dt>
          <dd className="text-end font-bold">
            <GameNode as="span" id={id} model={nodes[id]}>
              {fallback}
            </GameNode>{' '}
            {unit}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Controls for keyboard and touch.
 * @returns {import('react').ReactElement} Two short tables.
 */
function HelpBody() {
  const groups = [
    [strings.help.keyboardTitle, strings.help.keyboard],
    [strings.help.touchTitle, strings.help.touch],
  ];
  return groups.map(([title, rows]) => (
    <section key={title} className="mb-4">
      <h3 className="mb-2 font-bold text-primary">{title}</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        {rows.map(([key, action]) => (
          <div key={key} className="contents">
            <dt>
              <kbd>{key}</kbd>
            </dt>
            <dd className="opacity-80">{action}</dd>
          </div>
        ))}
      </dl>
    </section>
  ));
}

// Sheet key → [title, body component].
const SHEETS = {
  missions: [strings.menu.missions, MissionsBody],
  status: [strings.menu.status, StatusBody],
  help: [strings.menu.help, HelpBody],
};

/** @typedef {{sheet: string | null, nodes: object, actions: object, onClose: function}}
 * HudSheetsProps */
/**
 * The HUD's on-demand panels; longer text lives here instead of on screen.
 * @param {HudSheetsProps} props - Open sheet key (or null), snapshots, actions and close callback.
 * @returns {import('react').ReactElement} Sheet.
 */
export function HudSheets({ sheet, nodes, actions, onClose }) {
  const [title, Body] = SHEETS[sheet] ?? ['', null];
  return (
    <Sheet
      id="hud-sheet"
      open={Boolean(Body)}
      title={title}
      closeLabel={strings.menu.close}
      onClose={onClose}
    >
      {Body && <Body nodes={nodes} actions={actions} />}
    </Sheet>
  );
}
