import { COMPANY } from '@/config/company.js';
import { ASSETS } from '@/config/assets.js';
import { strings } from '@/i18n/fa.js';

/** @typedef {{nodes: object}} GameLoaderProps */
/**
 * Branded loading screen with a progress bar, shown while the 3D world is being built.
 * @param {GameLoaderProps} props - Interface snapshots; `loading` carries progress (0–1).
 * @returns {import('react').ReactElement} Loading screen.
 */
export function GameLoader({ nodes }) {
  const loading = nodes.loading ?? {};
  const percent = Math.round((loading.progress ?? 0) * 100);
  return (
    <section id="loading" hidden={loading.hidden} aria-busy={!loading.hidden}>
      <div className="flex w-64 flex-col items-center gap-4 text-center">
        <img
          src={ASSETS.brand.logo}
          alt={strings.landing.logoAlt}
          className="h-16 w-16 rounded-2xl"
        />
        <p className="text-lg font-bold text-hud">{COMPANY.shortName}</p>
        <div
          role="progressbar"
          aria-label={strings.app.buildingCity}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-2 w-full overflow-hidden rounded-full bg-white/10"
        >
          {/* Width is the live progress, so it is the one inline style here. */}
          <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </div>
        <p className="text-sm">
          {loading.text ?? strings.app.buildingCity}{' '}
          <span dir="ltr">{strings.app.loadingPercent(percent.toLocaleString('fa-IR'))}</span>
        </p>
      </div>
    </section>
  );
}
