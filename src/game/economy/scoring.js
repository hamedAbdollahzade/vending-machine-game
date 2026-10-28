import { CATEGORIES } from '../../constants/locations.js';

// The bonus for visiting every kind of place counts city locations, not the factory.
const CITY_CATEGORIES = Object.keys(CATEGORIES).filter((c) => c !== 'factory' && c !== 'test');

export const POINTS = { purchase: 100, discovery: 250, combo: 150, allCategories: 500 };

export const RANKS = [
  { name: 'تازه‌وارد', xp: 0 },
  { name: 'کاوشگر', xp: 600 },
  { name: 'راه‌بلد', xp: 1400 },
  { name: 'شکارچی دستگاه', xp: 2600 },
  { name: 'استاد نقشه', xp: 4200 },
  { name: 'افسانهٔ مشهد', xp: 6500 },
];

// Awards for `record`, given the purchases that happened before it.
export function awardsFor(previous, record) {
  const awards = [{ label: 'خرید موفق', points: POINTS.purchase }];
  const here = previous.filter((p) => p.machineId === record.machineId);
  if (!here.length) awards.push({ label: 'کشف مکان جدید', points: POINTS.discovery });
  // Paid once per machine: the first time it has sold both a drink and a snack.
  const typesHere = new Set(here.map((p) => p.type));
  if (typesHere.size === 1 && !typesHere.has(record.type))
    awards.push({ label: 'ترکیب نوشیدنی و خوراکی', points: POINTS.combo });
  const categories = new Set(
    previous.map((p) => p.category).filter((c) => CITY_CATEGORIES.includes(c)),
  );
  if (
    CITY_CATEGORIES.includes(record.category) &&
    !categories.has(record.category) &&
    categories.size === CITY_CATEGORIES.length - 1
  )
    awards.push({ label: 'همهٔ انواع مکان', points: POINTS.allCategories });
  return awards;
}

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

const placesVisited = (purchases) => new Set(purchases.map((p) => p.machineId)).size;

export const MISSIONS = [
  {
    id: 'factory',
    title: 'در دفتر فنی مهندسی کارخانه از دستگاه وندینگ خرید کن',
    target: 'factory',
    xp: 100,
    hetoman: 20,
    done: (ps) => ps.some((p) => p.machineId === 'factory'),
  },
  {
    id: 'first',
    title: 'با ماشین تا بوستان ملت برو و اولین خرید شهری را انجام بده',
    target: 'mellat-park',
    xp: 150,
    hetoman: 30,
    done: (ps) => ps.some((p) => p.machineId === 'mellat-park'),
  },
  {
    id: 'school',
    title: 'قبل از تعطیلی مدرسه (۱۳:۳۰) از دستگاه مدرسه خرید کن',
    target: 'school-rahil',
    xp: 200,
    hetoman: 40,
    done: (ps) => ps.some((p) => p.machineId === 'school-rahil'),
  },
  {
    id: 'campus',
    title: 'به دانشگاه فردوسی برو و یک خوراکی بخر',
    target: 'ferdowsi-university',
    xp: 200,
    hetoman: 40,
    done: (ps) => ps.some((p) => p.machineId === 'ferdowsi-university' && p.type === 'snack'),
  },
  {
    id: 'metro',
    title: 'از دستگاه ایستگاه مترو آزادی خرید کن',
    target: 'azadi-metro',
    xp: 150,
    hetoman: 30,
    done: (ps) => ps.some((p) => p.machineId === 'azadi-metro'),
  },
  {
    id: 'mall',
    title: 'با ماشین تا مشهد مال برو و خرید کن',
    target: 'mashhad-mall',
    xp: 250,
    hetoman: 50,
    done: (ps) => ps.some((p) => p.machineId === 'mashhad-mall'),
  },
  {
    id: 'explorer',
    title: 'از ۵ مکان متفاوت شهر خرید کن',
    target: null,
    xp: 400,
    hetoman: 80,
    done: (ps) => placesVisited(ps.filter((p) => CITY_CATEGORIES.includes(p.category))) >= 5,
  },
];

// Marks and returns missions that the current purchases complete for the first time.
export function completeMissions(state) {
  const fresh = MISSIONS.filter(
    (m) => !state.missionsDone.includes(m.id) && m.done(state.purchases),
  );
  for (const m of fresh) {
    state.missionsDone.push(m.id);
    state.xp += m.xp;
    state.balance += m.hetoman;
  }
  return fresh;
}

export const activeMission = (state) =>
  MISSIONS.find((m) => !state.missionsDone.includes(m.id)) ?? null;
