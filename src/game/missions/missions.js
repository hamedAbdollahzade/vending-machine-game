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
