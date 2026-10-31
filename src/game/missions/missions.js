// The mission list, as data. Each mission is a short chain of steps; the player always works on
// the first unfinished step of the first unfinished mission. Titles and step texts come from the
// strings file (missions.<id>, steps.<type>).
//
// Step types
// - goto:    reach the machine at `target`.
// - locate:  find `target` on the city map (select it there).
// - inspect: stand at `target` for a few seconds while the robot introduces the machine; its
//            machine card then opens.
// - order:   send an order request from the machine card of `target`.
// - buy:     buy anything from `target`.
// - places:  buy from `count` different machines in the city (not the factory).
// - read:    read the information board `target` in the factory yard.
// - meet:    meet Mr Mohammadi (`target`) at his desk; he tells the company story.
// - view:    open the products hall (`target` is 'showroom').
// - ask:     ask the robot in the products hall about a model's price or features.
// - request: send a purchase request for a model from the products hall.
//
// Targets are machine ids (constants/locations.js) or factory point ids
// (constants/factoryPoints.js).

export const MISSIONS = [
  {
    id: 'firstBuy',
    steps: [
      { type: 'goto', target: 'factory' },
      { type: 'buy', target: 'factory' },
    ],
    reward: { xp: 100, hetoman: 20 },
  },
  {
    id: 'aboutTour',
    steps: [
      { type: 'read', target: 'board-about' },
      { type: 'meet', target: 'mohammadi' },
      { type: 'read', target: 'board-contact' },
    ],
    reward: { xp: 150, hetoman: 20 },
  },
  {
    id: 'productsTour',
    steps: [
      { type: 'view', target: 'showroom' },
      { type: 'ask', target: 'showroom' },
      { type: 'request', target: 'showroom' },
    ],
    reward: { xp: 150, hetoman: 20 },
  },
  {
    id: 'parkGate',
    steps: [
      { type: 'locate', target: 'mellat-park' },
      { type: 'goto', target: 'mellat-park' },
      { type: 'buy', target: 'mellat-park' },
    ],
    reward: { xp: 150, hetoman: 30 },
  },
  {
    id: 'parkLake',
    steps: [
      { type: 'goto', target: 'mellat-lake' },
      { type: 'inspect', target: 'mellat-lake' },
    ],
    reward: { xp: 150, hetoman: 20 },
  },
  {
    id: 'parkSports',
    steps: [
      { type: 'goto', target: 'mellat-sports' },
      { type: 'inspect', target: 'mellat-sports' },
      { type: 'order', target: 'mellat-sports' },
    ],
    reward: { xp: 200, hetoman: 30 },
  },
  {
    id: 'parkTour',
    steps: [
      { type: 'buy', target: 'mellat-lake' },
      { type: 'buy', target: 'mellat-sports' },
    ],
    reward: { xp: 250, hetoman: 40 },
  },
  {
    id: 'explorer',
    steps: [{ type: 'places', count: 5 }],
    reward: { xp: 400, hetoman: 80 },
  },
];

// Distances (metres) for `goto` arrival and `inspect` range, and how long inspecting takes.
export const ARRIVE_RADIUS = 12;
export const INSPECT_RADIUS = 6;
export const INSPECT_SECONDS = 3;

// The mission each start mode leads with; the others follow in list order.
const LEAD_MISSION = { about: 'aboutTour', products: 'productsTour' };

/**
 * Mission ids in the order a start mode plays them: its lead mission first, then the rest.
 * @param {string} [mode] - Start mode; unknown or missing modes use the list order.
 * @returns {string[]} Mission ids.
 */
export function missionOrder(mode) {
  const ids = MISSIONS.map((mission) => mission.id);
  const lead = LEAD_MISSION[mode];
  if (!lead) return ids;
  return [lead, ...ids.filter((id) => id !== lead)];
}

/**
 * Finds a mission by id.
 * @param {string} id - Mission id.
 * @returns {object | null} The mission, or null.
 */
export const missionById = (id) => MISSIONS.find((mission) => mission.id === id) ?? null;
