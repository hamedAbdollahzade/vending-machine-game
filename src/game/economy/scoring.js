import { CATEGORIES } from '../../constants/locations.js';
import { strings } from '../../i18n/fa.js';

// The bonus for visiting every kind of place counts city locations, not the factory.
const CITY_CATEGORIES = Object.keys(CATEGORIES).filter((c) => c !== 'factory' && c !== 'test');
export const POINTS = {
  purchase: 100,
  discovery: 250,
  combo: 150,
  allCategories: 500,
};
export const RANKS = [
  {
    name: strings.ranks[0],
    xp: 0,
  },
  {
    name: strings.ranks[1],
    xp: 600,
  },
  {
    name: strings.ranks[2],
    xp: 1400,
  },
  {
    name: strings.ranks[3],
    xp: 2600,
  },
  {
    name: strings.ranks[4],
    xp: 4200,
  },
  {
    name: strings.ranks[5],
    xp: 6500,
  },
];

// Awards for `record`, given the purchases that happened before it.
/**
 * Runs the awards for operation for this subsystem.
 * @param {*} previous - previous.
 * @param {*} record - record.
 * @returns {*} Operation result, when applicable.
 */
export function awardsFor(previous, record) {
  const awards = [
    {
      label: strings.bonuses.purchase,
      points: POINTS.purchase,
    },
  ];
  const here = previous.filter((p) => p.machineId === record.machineId);
  if (!here.length)
    awards.push({
      label: strings.bonuses.newPlace,
      points: POINTS.discovery,
    });
  // Paid once per machine: the first time it has sold both a drink and a snack.
  const typesHere = new Set(here.map((p) => p.type));
  if (typesHere.size === 1 && !typesHere.has(record.type))
    awards.push({
      label: strings.bonuses.combo,
      points: POINTS.combo,
    });
  const categories = new Set(
    previous.map((p) => p.category).filter((c) => CITY_CATEGORIES.includes(c)),
  );
  if (
    CITY_CATEGORIES.includes(record.category) &&
    !categories.has(record.category) &&
    categories.size === CITY_CATEGORIES.length - 1
  )
    awards.push({
      label: strings.bonuses.allCategories,
      points: POINTS.allCategories,
    });
  return awards;
}
/**
 * Runs the rank for operation for this subsystem.
 * @param {*} xp - xp.
 * @returns {*} Operation result, when applicable.
 */
export function rankFor(xp) {
  let index = 0;
  while (index + 1 < RANKS.length && xp >= RANKS[index + 1].xp) index++;
  const next = RANKS[index + 1] ?? null;
  return {
    index,
    name: RANKS[index].name,
    min: RANKS[index].xp,
    next: next?.xp ?? null,
    progress: next ? (xp - RANKS[index].xp) / (next.xp - RANKS[index].xp) : 1,
  };
}
