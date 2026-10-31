import iran from '../../data/iran.json';
import { CATEGORIES, lockedPlaces } from '../../constants/locations.js';
import { catalog, priceAt, isOpen, fa } from '../economy/gameState.js';
import { drawFullMap, drawIran } from '../world/mapRender.js';
import { formatDistance } from '../../utils/geo.js';
import { strings } from '../../i18n/fa.js';
/**
 * Runs the size canvas operation for this subsystem.
 * @param {*} context - context.
 * @param {*} c - c.
 * @returns {*} Operation result, when applicable.
 */
export function sizeCanvas(context, c) {
  const r = c.getBoundingClientRect(),
    dpr = Math.min(devicePixelRatio, 2);
  c.width = Math.max(1, r.width * dpr);
  c.height = Math.max(1, r.height * dpr);
  return dpr;
}
/**
 * Runs the render map operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export function renderMap(context) {
  if (!context.ui.read('map-dialog').open) return;
  if (context.mapTab === 'city') {
    const dpr = context.sizeCanvas(context.mapCanvas);
    const pos = context.mode === 'drive' ? context.car : context.player;
    drawFullMap(context.mapCanvas.getContext('2d'), context.mapAssets, context.mapView, {
      dpr,
      markers: context.markers(),
      route: context.route?.points,
      selected: context.selected,
      player: {
        x: pos.x,
        z: pos.z,
        heading: context.mode === 'drive' ? context.car.heading : context.player.heading,
      },
    });
  } else {
    const dpr = context.sizeCanvas(context.iranCanvas),
      c = context.iranCanvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawIran(c, iran, {
      width: context.iranCanvas.width / dpr,
      height: context.iranCanvas.height / dpr,
      t: context.elapsed,
      cities: context.CITIES,
    });
  }
}
/**
 * Runs the render machine list operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export function renderMachineList(context) {
  const pos = context.mode === 'drive' ? context.car : context.player;
  const visited = new Set(context.state.purchases.map((p) => p.machineId));
  const items = context.activeStations().map((s) => ({
    id: s.def.id,
    name: s.def.name,
    icon: CATEGORIES[s.def.category].icon,
    category: CATEGORIES[s.def.category].label,
    visited: visited.has(s.def.id),
    open: isOpen(s.def, context.state.minutes),
    selected: s.def.id === context.selected,
    distance: formatDistance(Math.hypot(s.x - pos.x, s.z - pos.z)),
  }));
  context.ui.patch('machine-list', {
    items: [
      ...items,
      ...lockedPlaces.map((p) => ({
        ...p,
        id: p.name,
        locked: true,
      })),
    ],
  });
}
/**
 * Runs the select machine operation for this subsystem.
 * @param {*} context - context.
 * @param {*} id - id.
 * @param {*} center - center.
 * @returns {*} Operation result, when applicable.
 */
export function selectMachine(context, id, center = false) {
  context.selected = id;
  // Finding the machine on the map is a mission step ("locate").
  context.reportMissionEvent({ type: 'locate', machineId: id });
  const s = context.stationById(id),
    def = s.def;
  if (center) {
    context.mapView.cx = s.x;
    context.mapView.cz = s.z;
    context.mapView.mpp = Math.min(context.mapView.mpp, 1.4);
  }
  context.ui.patch('machine-detail', {
    hidden: false,
  });
  context.ui.patch('detail-name', {
    text: `${CATEGORIES[def.category].icon} ${def.name}`,
  });
  context.ui.patch('detail-address', {
    text: `📍 ${def.address}`,
  });
  context.ui.patch('detail-meta', {
    text: strings.map.details(context.hoursText(def), isOpen(def, context.state.minutes), def.note),
  });
  context.ui.patch('detail-products', {
    text: def.products
      .map((id) => `${catalog[id].icon} ${catalog[id].name} ${fa(priceAt(def, id))}`)
      .join(' · '),
  });
  context.ui.patch('route-button', {
    text: context.waypoint === id ? strings.map.routeActive : strings.map.route,
  });
  context.renderMachineList();
  context.renderMap();
}
/**
 * Runs the open map operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export function openMap(context) {
  if (context.anyDialogOpen()) return;
  document.exitPointerLock?.();
  context.keys.clear();
  const pos = context.mode === 'drive' ? context.car : context.player;
  Object.assign(context.mapView, {
    cx: pos.x,
    cz: pos.z,
    mpp: 2.2,
  });
  context.ui.open('map-dialog');
  // Factory points (boards, the manager) are not on the machine map, so they are not selected.
  const objective = context.objectiveStation();
  context.selected ??= objective && !objective.def.poi ? objective.def.id : null;
  if (context.selected) context.selectMachine(context.selected);
  context.renderMachineList();
  context.renderMap();
}
