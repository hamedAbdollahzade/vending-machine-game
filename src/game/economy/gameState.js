import { strings } from '../../i18n/fa.js';
// Money is counted in whole hetoman: 10 hetoman = 100,000 rial.
export const INITIAL_BALANCE = 500;
export const START_MINUTES = 8 * 60 + 30;
/**
 * Runs the fa operation for this subsystem.
 * @param {*} n - n.
 * @returns {*} Operation result, when applicable.
 */
export const fa = (n) => n.toLocaleString('fa-IR');
/**
 * Runs the format hetoman operation for this subsystem.
 * @param {*} value - value.
 * @returns {*} Operation result, when applicable.
 */
export const formatHetoman = (value) => strings.units.hetoman(fa(value));
/**
 * Runs the hetoman to rial operation for this subsystem.
 * @param {*} value - value.
 * @returns {*} Operation result, when applicable.
 */
export const hetomanToRial = (value) => value * 10000;
/**
 * Runs the format clock operation for this subsystem.
 * @param {*} minutes - minutes.
 * @returns {*} Operation result, when applicable.
 */
export const formatClock = (minutes) => {
  const m = Math.floor(minutes) % (24 * 60);
  return `${fa(Math.floor(m / 60)).padStart(2, '۰')}:${fa(m % 60).padStart(2, '۰')}`;
};
export const catalog = {
  juice: {
    id: 'juice',
    name: strings.snacks.juice,
    icon: '🧃',
    cost: 35,
    type: 'drink',
  },
  water: {
    id: 'water',
    name: strings.snacks.water,
    icon: '💧',
    cost: 15,
    type: 'drink',
  },
  milk: {
    id: 'milk',
    name: strings.snacks.milk,
    icon: '🥛',
    cost: 40,
    type: 'drink',
  },
  tea: {
    id: 'tea',
    name: strings.snacks.tea,
    icon: '🧋',
    cost: 45,
    type: 'drink',
  },
  lemonade: {
    id: 'lemonade',
    name: strings.snacks.lemonade,
    icon: '🍋',
    cost: 40,
    type: 'drink',
  },
  biscuit: {
    id: 'biscuit',
    name: strings.snacks.biscuit,
    icon: '🍪',
    cost: 25,
    type: 'snack',
  },
  chocolate: {
    id: 'chocolate',
    name: strings.snacks.chocolate,
    icon: '🍫',
    cost: 30,
    type: 'snack',
  },
  nuts: {
    id: 'nuts',
    name: strings.snacks.nuts,
    icon: '🥜',
    cost: 65,
    type: 'snack',
  },
  cake: {
    id: 'cake',
    name: strings.snacks.cake,
    icon: '🧁',
    cost: 35,
    type: 'snack',
  },
};
/**
 * Runs the price at operation for this subsystem.
 * @param {*} machine - machine.
 * @param {*} productId - product Id.
 * @returns {*} Operation result, when applicable.
 */
export const priceAt = (machine, productId) =>
  Math.round(catalog[productId].cost * machine.priceFactor);
/**
 * Runs the is open operation for this subsystem.
 * @param {*} machine - machine.
 * @param {*} minutes - minutes.
 * @returns {*} Operation result, when applicable.
 */
export function isOpen(machine, minutes) {
  const m = minutes % (24 * 60);
  return m >= machine.hours[0] && m < machine.hours[1];
}
/**
 * Creates state resources for the game.

 * @returns {*} Operation result, when applicable.
 */
export function createState() {
  return {
    balance: INITIAL_BALANCE,
    purchases: [],
    xp: 0,
    missionsDone: [],
    // Current mission and step (see game/missions).
    missionIndex: 0,
    missionStep: 0,
    minutes: START_MINUTES,
    busy: false,
  };
}

// Returns why a purchase cannot happen, or null when it can.
/**
 * Runs the purchase blocker operation for this subsystem.
 * @param {*} state - state.
 * @param {*} machine - machine.
 * @param {*} productId - product Id.
 * @returns {*} Operation result, when applicable.
 */
export function purchaseBlocker(state, machine, productId) {
  if (!machine || !machine.products.includes(productId)) return 'unknown';
  if (state.busy) return 'busy';
  if (!isOpen(machine, state.minutes)) return 'closed';
  if (state.balance < priceAt(machine, productId)) return 'funds';
  return null;
}
/**
 * Runs the purchase operation for this subsystem.
 * @param {*} state - state.
 * @param {*} machine - machine.
 * @param {*} productId - product Id.
 * @returns {*} Operation result, when applicable.
 */
export function purchase(state, machine, productId) {
  if (purchaseBlocker(state, machine, productId)) return null;
  const product = catalog[productId],
    price = priceAt(machine, productId);
  const record = {
    machineId: machine.id,
    category: machine.category,
    productId,
    type: product.type,
    price,
    minutes: state.minutes,
  };
  state.balance -= price;
  state.purchases.push(record);
  return record;
}

// The run ends once no open or later-opening machine sells anything the player can afford.
/**
 * Runs the can afford anything operation for this subsystem.
 * @param {*} state - state.
 * @param {*} machines - machines.
 * @returns {*} Operation result, when applicable.
 */
export function canAffordAnything(state, machines) {
  return machines.some(
    (m) =>
      m.products.some((id) => priceAt(m, id) <= state.balance) && state.minutes % 1440 < m.hours[1],
  );
}
