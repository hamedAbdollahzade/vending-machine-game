// Money is counted in whole hetoman: 10 hetoman = 100,000 rial.
export const INITIAL_BALANCE = 500;
export const START_MINUTES = 8 * 60 + 30;
export const fa = (n) => n.toLocaleString('fa-IR');
export const formatHetoman = (value) => `${fa(value)} هتومان`;
export const hetomanToRial = (value) => value * 10000;
export const formatClock = (minutes) => {
  const m = Math.floor(minutes) % (24 * 60);
  return `${fa(Math.floor(m / 60)).padStart(2, '۰')}:${fa(m % 60).padStart(2, '۰')}`;
};

export const catalog = {
  juice: { id: 'juice', name: 'آب‌میوه', icon: '🧃', cost: 35, type: 'drink' },
  water: { id: 'water', name: 'آب معدنی', icon: '💧', cost: 15, type: 'drink' },
  milk: { id: 'milk', name: 'شیر کاکائو', icon: '🥛', cost: 40, type: 'drink' },
  tea: { id: 'tea', name: 'چای سرد', icon: '🧋', cost: 45, type: 'drink' },
  lemonade: { id: 'lemonade', name: 'لیموناد', icon: '🍋', cost: 40, type: 'drink' },
  biscuit: { id: 'biscuit', name: 'بیسکویت', icon: '🍪', cost: 25, type: 'snack' },
  chocolate: { id: 'chocolate', name: 'شکلات', icon: '🍫', cost: 30, type: 'snack' },
  nuts: { id: 'nuts', name: 'آجیل', icon: '🥜', cost: 65, type: 'snack' },
  cake: { id: 'cake', name: 'کیک', icon: '🧁', cost: 35, type: 'snack' },
};

export const priceAt = (machine, productId) =>
  Math.round(catalog[productId].cost * machine.priceFactor);

export function isOpen(machine, minutes) {
  const m = minutes % (24 * 60);
  return m >= machine.hours[0] && m < machine.hours[1];
}

export function createState() {
  return {
    balance: INITIAL_BALANCE,
    purchases: [],
    xp: 0,
    missionsDone: [],
    minutes: START_MINUTES,
    busy: false,
  };
}

// Returns why a purchase cannot happen, or null when it can.
export function purchaseBlocker(state, machine, productId) {
  if (!machine || !machine.products.includes(productId)) return 'unknown';
  if (state.busy) return 'busy';
  if (!isOpen(machine, state.minutes)) return 'closed';
  if (state.balance < priceAt(machine, productId)) return 'funds';
  return null;
}

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
export function canAffordAnything(state, machines) {
  return machines.some(
    (m) =>
      m.products.some((id) => priceAt(m, id) <= state.balance) && state.minutes % 1440 < m.hours[1],
  );
}
