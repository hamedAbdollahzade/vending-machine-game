/**
 * Runs the say operation for this subsystem.
 * @param {*} context - context.
 * @param {*} speaker - speaker.
 * @param {*} text - text.
 * @param {*} face - face.
 * @param {*} seconds - seconds.
 * @returns {*} Operation result, when applicable.
 */
export // `face` picks the robot's expression portrait (public/robot/<face>.webp).
function say(context, speaker, text, face = 'happy', seconds = Math.max(2.6, text.length * 0.06)) {
  if (context.lines.some((l) => l.text === text)) return;
  context.lines.push({
    speaker,
    text,
    face,
    seconds,
  });
}
/**
 * Updates subtitles from the active simulation.
 * @param {*} context - context.
 * @param {*} dt - dt.
 * @returns {*} Operation result, when applicable.
 */
export function updateSubtitles(context, dt) {
  context.lineTimer -= dt;
  if (context.lineTimer > 0) return;
  const next = context.lines.shift();
  context.ui.patch('subtitle', {
    hidden: !next,
  });
  context.talking = next?.speaker === 'robot';
  if (!next) return;
  context.ui.patch('subtitle-speaker', {
    text: `${context.SPEAKERS[next.speaker]}:`,
  });
  context.ui.patch('subtitle-speaker', {
    className: ['robot', 'father', 'child'].includes(next.speaker) ? next.speaker : 'staff',
  });
  context.ui.patch('subtitle-text', {
    text: next.text,
  });
  context.ui.patch('subtitle-face', {
    hidden: next.speaker !== 'robot',
  });
  if (next.speaker === 'robot')
    context.ui.patch('subtitle-face', {
      src: `./robot/${next.face}.webp`,
    });
  context.lineTimer = next.seconds;
}

// ---------- Sound ----------
/**
 * Runs the tone operation for this subsystem.
 * @param {*} context - context.
 * @param {*} freq - freq.
 * @param {*} duration - duration.
 * @param {*} volume - volume.
 * @param {*} type - type.
 * @returns {*} Operation result, when applicable.
 */
export function tone(context, freq, duration = 0.12, volume = 0.05, type = 'sine') {
  if (!context.soundOn) return;
  const o = context.audio.createOscillator(),
    g = context.audio.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, context.audio.currentTime);
  o.frequency.exponentialRampToValueAtTime(freq * 0.7, context.audio.currentTime + duration);
  g.gain.setValueAtTime(volume, context.audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, context.audio.currentTime + duration);
  o.connect(g).connect(context.audio.destination);
  o.start();
  o.stop(context.audio.currentTime + duration);
}
