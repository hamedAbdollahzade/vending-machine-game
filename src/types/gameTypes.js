/**
 * @typedef {object} PurchaseRecord
 * @property {string} machineId - Stable machine identifier.
 * @property {string} category - Machine location category.
 * @property {string} productId - Purchased consumable identifier.
 * @property {'drink'|'snack'} type - Picnic product category.
 * @property {number} price - Integer hetoman charged.
 * @property {number} minutes - Simulation clock at approval.
 */
/**
 * @typedef {object} GameProgress
 * @property {number} balance - Integer hetoman balance.
 * @property {number} xp - Earned experience.
 * @property {PurchaseRecord[]} purchases - Approved purchases.
 * @property {string[]} missionsDone - Rewarded mission identifiers.
 * @property {number} minutes - Simulation clock in minutes.
 * @property {boolean} busy - Transaction or delivery lock.
 */
export {};
