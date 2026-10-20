export function createJourney() { return {phase: 'home', time: 0, distance: 0, speed: 0, lane: 0}; }
export function advanceJourney(journey) {
    const next = {home: 'boarding', entrance: 'walking'}[journey.phase];
    if (!next) return false;
    journey.phase = next; journey.time = 0; return true;
}
export function tickJourney(journey, dt, paused = false, input = {}) {
    if (paused) return;
    journey.time += dt;
    if (journey.phase === 'boarding' && journey.time >= 2) { journey.phase = 'driving'; journey.time = 0; return; }
    if (journey.phase === 'driving') {
        const throttle = Math.max(-1, Math.min(1, input.throttle ?? 0));
        journey.speed = Math.max(0, Math.min(6, journey.speed + (throttle > 0 ? 3.5 : throttle < 0 ? -7 : -2.5) * dt));
        journey.distance = Math.min(21, journey.distance + journey.speed * dt);
        journey.lane = Math.max(-.75, Math.min(.75, journey.lane + (input.steer ?? 0) * dt * journey.speed * .25));
        if (journey.distance >= 21) { journey.phase = 'entrance'; journey.time = 0; journey.speed = 0; journey.lane = 0; }
    }
}
export const journeyLabels = {
    home: ['از خانه تا کوه', 'پدر: همه‌چی آماده‌ست؟ بیا سوار ماشین بشیم.', 'سوار ماشین شو · F'],
    boarding: ['آغاز سفر', 'داریم سوار ماشین می‌شیم…', ''],
    driving: ['جادهٔ جنگلی', 'با W یا ↑ گاز بده، با S یا ↓ ترمز کن و با A / D فرمان بده؛ تا ورودی جنگل رانندگی کن.', ''],
    entrance: ['ورودی جنگل', 'پدر: رسیدیم. از اینجا پیاده می‌ریم؛ بالای کوه پیک‌نیک می‌کنیم.', 'پیاده شو و وارد جنگل شو · F']
};
