import { purchase, purchaseBlocker } from './gameState.js';

// idle → approaching (camera moves to the reader) → ready → approved (card swiped, charged once).
export function createPayment() {
  return { phase: 'idle', machine: null, productId: null, record: null };
}

export function beginPayment(state, payment, machine, productId) {
  if (payment.phase !== 'idle' || purchaseBlocker(state, machine, productId)) return false;
  Object.assign(payment, { phase: 'approaching', machine, productId, record: null });
  state.busy = true;
  return true;
}

export function readyPayment(payment) {
  if (payment.phase !== 'approaching') return false;
  payment.phase = 'ready';
  return true;
}

export function swipePayment(state, payment) {
  if (payment.phase !== 'ready') return false;
  state.busy = false;
  const record = purchase(state, payment.machine, payment.productId);
  if (!record) {
    Object.assign(payment, createPayment());
    return false;
  }
  state.busy = true;
  payment.record = record;
  payment.phase = 'approved';
  return true;
}

export function cancelPayment(state, payment) {
  if (!['approaching', 'ready'].includes(payment.phase)) return false;
  Object.assign(payment, createPayment());
  state.busy = false;
  return true;
}
