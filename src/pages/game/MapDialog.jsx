import { MachineDetails } from './MachineDetails.jsx';
import { MachineList } from './MachineList.jsx';
import { GameNode } from '@/components/shared/GameNode.jsx';
import { strings } from '@/i18n/fa.js';
/** @typedef {{nodes:object,actions:object}} MapDialogProps */
/** Presents the MapDialog view using plain models and semantic native elements.
 * @param {MapDialogProps} props - Interface snapshots and callbacks.
 * @returns {import('react').ReactElement} Game panel.
 */
export function MapDialog({ nodes, actions }) {
  return (
    <>
      <GameNode
        as="dialog"
        id="map-dialog"
        model={nodes['map-dialog']}
        onClose={() => actions.close('map-dialog')}
      >
        <header>
          <div className="tabs" role="tablist">
            <GameNode
              as="button"
              type="button"
              role="tab"
              data-tab="city"
              aria-selected="true"
              id="tab-city"
              model={nodes['tab-city']}
              onAction={() => actions.emit('tab-city')}
            >
              {strings.common.mashhad}
            </GameNode>
            <GameNode
              as="button"
              type="button"
              role="tab"
              data-tab="iran"
              aria-selected="false"
              id="tab-iran"
              model={nodes['tab-iran']}
              onAction={() => actions.emit('tab-iran')}
            >
              {strings.common.iran}
            </GameNode>
          </div>
          <GameNode
            as="button"
            type="button"
            className="close"
            id="map-close"
            aria-label={strings.map.close}
            model={nodes['map-close']}
            onAction={() => actions.emit('map-close')}
          >
            {'✕'}
          </GameNode>
        </header>
        <div className="map-body">
          <div className="map-view">
            <GameNode as="canvas" id="fullmap" model={nodes['fullmap']} />
            <GameNode as="canvas" id="iran-map" hidden model={nodes['iran-map']} />
            <p className="map-help">{strings.map.help}</p>
          </div>
          <aside className="map-side">
            <h3>{strings.map.machines}</h3>
            <MachineDetails nodes={nodes} actions={actions} />
            <MachineList nodes={nodes} actions={actions} />
          </aside>
        </div>
      </GameNode>
    </>
  );
}
