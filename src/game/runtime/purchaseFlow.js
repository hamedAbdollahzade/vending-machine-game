import * as THREE from 'three';
import { MAX_WALKING_SPEED } from '../device/realworld.js';
import { machines, CATEGORIES, FACTORY } from '../../constants/locations.js';
import {
  catalog,
  priceAt,
  isOpen,
  purchaseBlocker,
  formatHetoman,
  fa,
  canAffordAnything,
} from '../economy/gameState.js';
import {
  createPayment,
  beginPayment,
  readyPayment,
  swipePayment,
  cancelPayment,
} from '../economy/payment.js';
import {
  awardsFor,
  rankFor,
  completeMissions,
  activeMission,
  MISSIONS,
} from '../economy/scoring.js';
/**
 * Runs the open showroom operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export function openShowroom(context) {
  const inFactory =
    Math.hypot(context.player.x - FACTORY.center.x, context.player.z - FACTORY.center.z) < 130;
  const sample =
    context.nearShowroom() ??
    (inFactory && !context.real.on && context.mode === 'walk' ? context.showroom.samples[0] : null);
  if (!sample || context.state.busy || context.payment.phase !== 'idle' || context.ended) return;
  context.ui.patch('showroom', {
    modelId: sample.model.id,
  });
  context.ui.patch('showroom-response', {
    text: 'روبات: سلام! قیمت و امکانات هر سه مدل را می‌توانم توضیح بدهم.',
  });
  context.keys.clear();
  document.exitPointerLock?.();
  context.ui.open('showroom');
}
/**
 * Runs the interact operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export function interact(context) {
  const station = context.nearStation();
  if (!station || context.state.busy || context.payment.phase !== 'idle' || context.ended) return;
  if (context.real.on && (context.real.fix?.speed ?? 0) > MAX_WALKING_SPEED) {
    context.say('father', 'داریم سریع حرکت می‌کنیم؛ اول بایستیم، بعد خرید کنیم.');
    return;
  }
  if (!isOpen(station.def, context.state.minutes)) {
    context.say(
      context.guideOut() ? 'robot' : 'father',
      `این دستگاه الان بسته است. ساعت کاری: ${context.hoursText(station.def)}.`,
      'serious',
    );
    return;
  }
  context.shopStation = station;
  context.renderShop();
  document.exitPointerLock?.();
  context.keys.clear();
  context.ui.open('shop');
  context.tone(750);
}
/**
 * Runs the render shop operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export function renderShop(context) {
  const def = context.shopStation.def;
  context.ui.patch('shop-category', {
    text: `${CATEGORIES[def.category].icon} ${CATEGORIES[def.category].label} · ساعت کاری ${context.hoursText(def)}`,
  });
  context.ui.patch('shop-name', {
    text: `روبات مارکت · ${def.name}`,
  });
  context.ui.patch('shop-address', {
    text: def.address,
  });
  context.ui.patch('shop-note', {
    text: `${def.note} · موجودی شما: ${formatHetoman(context.state.balance)}`,
  });
  context.ui.patch('products', {
    items: def.products.map((id) => ({
      id,
      ...catalog[id],
      price: priceAt(def, id),
      blocked: purchaseBlocker(context.state, def, id),
    })),
  });
}
/**
 * Runs the start payment operation for this subsystem.
 * @param {*} context - context.
 * @param {*} productId - product Id.
 * @returns {*} Operation result, when applicable.
 */
export function startPayment(context, productId) {
  if (!beginPayment(context.state, context.payment, context.shopStation.def, productId)) return;
  context.payment.station = context.shopStation;
  context.payment.timer = 0;
  context.ui.close('shop');
  const p = catalog[productId];
  context.ui.patch('payment', {
    hidden: false,
  });
  context.ui.patch('payment-title', {
    text: `${p.icon} ${p.name} · ${formatHetoman(priceAt(context.shopStation.def, productId))}`,
  });
  context.ui.patch('payment-step', {
    text: 'در حال نزدیک شدن به کارت‌خوان…',
  });
  context.ui.patch('swipe', {
    disabled: true,
  });
  context.ui.patch('cancel-payment', {
    hidden: false,
  });
  context.say('child', 'بابا، کارت رو بده من بکشم!');
}
/**
 * Runs the swipe operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export function swipe(context) {
  if (!swipePayment(context.state, context.payment)) return;
  context.payment.timer = 0;
  context.payment.station.model.card.visible = true;
  context.ui.patch('swipe', {
    disabled: true,
  });
  context.ui.patch('cancel-payment', {
    hidden: true,
  });
  context.ui.patch('payment-step', {
    text: 'پرداخت موفق ✓ محصول در حال تحویل است',
  });
  context.tone(1100, 0.3);
  context.refreshHUD();
}
/**
 * Runs the cancel operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export function cancel(context) {
  if (!cancelPayment(context.state, context.payment)) return;
  context.ui.patch('payment', {
    hidden: true,
  });
}
/**
 * Updates payment from the active simulation.
 * @param {*} context - context.
 * @param {*} dt - dt.
 * @returns {*} Operation result, when applicable.
 */
export function updatePayment(context, dt) {
  if (context.payment.phase === 'idle') return;
  context.payment.timer += dt;
  const model = context.payment.station.model;
  if (context.payment.phase === 'approaching' && context.payment.timer > 1) {
    readyPayment(context.payment);
    context.ui.patch('swipe', {
      disabled: false,
    });
    context.ui.patch('payment-step', {
      text: 'کارت را بکشید: دکمهٔ «کشیدن کارت» یا کلید C',
    });
  }
  if (context.payment.phase === 'approved') {
    const t = Math.min(1, context.payment.timer);
    model.card.position.set(0.95 - t * 0.25, 1.7 - t * 0.1, 0.66);
    if (context.payment.timer > 1.2) {
      model.card.visible = false;
      context.ui.patch('payment', {
        hidden: true,
      });
      model.setDelivery(context.payment.productId);
      context.deliveryTimer = 2.6;
      context.payment.delivering = {
        station: context.payment.station,
        record: context.payment.record,
      };
      Object.assign(context.payment, createPayment());
    }
  }
}
/**
 * Updates delivery from the active simulation.
 * @param {*} context - context.
 * @param {*} dt - dt.
 * @returns {*} Operation result, when applicable.
 */
export function updateDelivery(context, dt) {
  if (context.deliveryTimer <= 0) return;
  context.deliveryTimer = Math.max(0, context.deliveryTimer - dt);
  const { station, record } = context.payment.delivering,
    model = station.model,
    t = 2.6 - context.deliveryTimer;
  const slot = record ? catalog[record.productId] : null;
  model.delivery.visible = t < 2.4;
  // Falls from a shelf, waits in the tray, then lifts toward the child's hands.
  const shelf = new THREE.Vector3(
    -0.5 + (record.price % 7) * 0.1,
    1.2 + (record.price % 5) * 0.15,
    0.45,
  );
  if (t < 0.8) model.delivery.position.lerpVectors(shelf, model.slotPoint, t / 0.8);
  else
    model.delivery.position
      .copy(model.slotPoint)
      .add(new THREE.Vector3(0, Math.max(0, t - 1.6) * 0.6, Math.max(0, t - 1.6) * 0.8));
  model.flap.rotation.x = t > 0.7 && t < 2 ? -1 : 0;
  if (context.deliveryTimer > 0) return;
  model.flap.rotation.x = 0;
  context.state.busy = false;
  context.tone(980, 0.18);
  context.reward(record, slot);
}
/**
 * Runs the reward operation for this subsystem.
 * @param {*} context - context.
 * @param {*} record - record.
 * @param {*} product - product.
 * @returns {*} Operation result, when applicable.
 */
export function reward(context, record, product) {
  const awards = awardsFor(context.state.purchases.slice(0, -1), record),
    rankBefore = rankFor(context.state.xp).index;
  if (context.real.on)
    awards.push({
      label: 'خرید در دنیای واقعی',
      points: 200,
    });
  const total = awards.reduce((s, a) => s + a.points, 0);
  context.state.xp += total;
  context.ui.patch('awards', {
    items: awards,
    total,
  });
  context.clearTimeout(context.reward.timeout);
  context.reward.timeout = context.setTimeout(
    () =>
      context.ui.patch('awards', {
        items: [],
      }),
    3200,
  );
  context.say('child', `${product.icon} ${product.name} گرفتم! مرسی بابا.`);
  const done = completeMissions(context.state);
  for (const m of done) {
    context.showBanner(
      'مأموریت انجام شد',
      m.title,
      `+${fa(m.xp)} XP · +${formatHetoman(m.hetoman)} پاداش`,
    );
    context.tone(660, 0.5);
  }
  if (rankFor(context.state.xp).index > rankBefore)
    context.setTimeout(
      () =>
        context.showBanner(
          'ارتقای درجه',
          rankFor(context.state.xp).name,
          'دستگاه‌های بیشتری پیدا کن',
        ),
      done.length ? 3400 : 0,
    );
  const next = activeMission(context.state);
  if (next) {
    context.waypoint = null;
    context.route = null;
    context.setTimeout(
      () =>
        context.say(context.guideOut() ? 'robot' : 'father', `مأموریت بعدی: ${next.title}`, 'wink'),
      1500,
    );
  }
  context.refreshHUD();
  context.checkEnd();
}
/**
 * Runs the show banner operation for this subsystem.
 * @param {*} context - context.
 * @param {*} tag - tag.
 * @param {*} title - title.
 * @param {*} sub - sub.
 * @returns {*} Operation result, when applicable.
 */
export function showBanner(context, tag, title, sub) {
  context.ui.patch('banner', {
    tag,
    title,
    sub,
    hidden: false,
  });
  context.clearTimeout(context.showBanner.timeout);
  context.showBanner.timeout = context.setTimeout(
    () =>
      context.ui.patch('banner', {
        hidden: true,
      }),
    3200,
  );
}
/**
 * Runs the check end operation for this subsystem.
 * @param {*} context - context.
 * @returns {*} Operation result, when applicable.
 */
export function checkEnd(context) {
  const allDone = context.state.missionsDone.length === MISSIONS.length;
  if (context.ended || (!allDone && canAffordAnything(context.state, machines))) return;
  context.ended = true;
  document.exitPointerLock?.();
  context.ui.patch('end-tag', {
    text: allDone ? 'عملیات موفق' : 'پایان بودجه',
  });
  context.ui.patch('end-title', {
    text: allDone ? 'عملیات مشهد کامل شد!' : 'بودجهٔ امروز تمام شد',
  });
  context.ui.patch('end-text', {
    text: allDone
      ? 'همهٔ مأموریت‌های محدودهٔ بوستان ملت انجام شد. مناطق دیگر مشهد به‌زودی باز می‌شوند.'
      : 'دیگر نمی‌توانید از دستگاه‌ها خرید کنید. امتیاز امروز:',
  });
  const places = new Set(context.state.purchases.map((p) => p.machineId)).size;
  context.ui.patch('end-stats', {
    items: [
      ['امتیاز', `${fa(context.state.xp)} XP`],
      ['درجه', rankFor(context.state.xp).name],
      ['خریدها', fa(context.state.purchases.length)],
      ['مکان‌های کشف‌شده', `${fa(places)} از ${fa(machines.length)}`],
      ['مأموریت‌ها', `${fa(context.state.missionsDone.length)} از ${fa(MISSIONS.length)}`],
      ['باقی‌مانده', formatHetoman(context.state.balance)],
    ],
  });
  context.ui.patch('continue', {
    hidden: !allDone,
  });
  context.ui.open('end');
}
