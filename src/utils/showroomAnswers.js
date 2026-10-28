import { SHOWROOM_CATALOG } from '../constants/showroomCatalog.js';

/** Looks up a display model by its stable identifier.
 * @param {string} id - Model identifier.
 * @returns {object|null} Catalog model, or null for unknown identifiers.
 */
export function showroomModelById(id) {
  return SHOWROOM_CATALOG.find((model) => model.id === id) ?? null;
}

/** Formats a machine purchase price in rial without converting it to game money.
 * @param {number} price - Full machine price in rial.
 * @returns {string} Persian rial price.
 */
export function formatRial(price) {
  return `${price.toLocaleString('fa-IR')} ریال`;
}

/** Builds the robot's deterministic answer from the shared showroom catalog.
 * @param {{modelId:string,topic:'price'|'features'}} question - Requested model and topic.
 * @returns {string|null} Robot answer; unknown questions are rejected.
 */
export function showroomAnswer({ modelId, topic }) {
  const model = showroomModelById(modelId);
  if (!model) return null;
  if (topic === 'price')
    return `قیمت ${model.name}، ${formatRial(model.priceNumeric)} است. این قیمت خود دستگاه به ریال است و از بودجهٔ بازی کم نمی‌شود.`;
  if (topic === 'features')
    return `${model.name}: ${model.description} امکانات: ${model.highlights.join('، ')}.`;
  return null;
}
