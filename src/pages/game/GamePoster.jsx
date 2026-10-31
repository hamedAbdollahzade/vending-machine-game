import { COMPANY } from '@/config/company.js';
import { ASSETS } from '@/config/assets.js';
import { strings } from '@/i18n/fa.js';
import { SECTION_BODIES } from './startScreen/InfoSectionContent.jsx';

// Company sections the poster shows when the 3D game cannot run.
const FALLBACK_SECTIONS = ['about', 'contact', 'address'];

/** @typedef {{canRender: boolean, onEnter: function}} GamePosterProps */
/**
 * Light poster in place of the 3D game: a hero image and an "Enter the game" button, so an
 * embedding page loads nothing heavy until the visitor asks. When the browser cannot draw 3D it
 * explains that and shows the company information instead.
 * @param {GamePosterProps} props - Whether WebGL works, and the callback that starts the game.
 * @returns {import('react').ReactElement} Poster.
 */
export function GamePoster({ canRender, onEnter }) {
  return (
    <main className="min-h-dvh bg-surface text-hud">
      <div className="relative">
        <img
          src={ASSETS.brand.hero}
          alt={strings.poster.heroAlt}
          className="h-[45dvh] w-full object-cover opacity-60"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-surface to-transparent p-6 pt-20">
          <div className="mx-auto max-w-2xl">
            <p className="text-2xl font-black md:text-4xl">{COMPANY.name}</p>
            <p className="mt-2 text-primary">{COMPANY.tagline}</p>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-2xl p-6">
        <p className="opacity-80">{strings.landing.intro}</p>
        {canRender ? (
          <button
            type="button"
            className="start-option start-option-primary mt-6"
            onClick={onEnter}
          >
            {strings.poster.enter}
          </button>
        ) : (
          <FallbackInfo />
        )}
      </div>
    </main>
  );
}

/**
 * Company information for browsers without 3D support.
 * @returns {import('react').ReactElement} Notice and sections.
 */
function FallbackInfo() {
  return (
    <>
      <p role="alert" className="mt-6 rounded-xl border border-primary/40 p-4">
        {strings.poster.noWebgl}
      </p>
      {FALLBACK_SECTIONS.map((key) => {
        const Body = SECTION_BODIES[key];
        const title = key === 'about' ? strings.landing.history : strings.landing.sections[key];
        return (
          <section key={key} className="mt-8">
            <h2 className="mb-3 text-lg font-bold">{title}</h2>
            <Body />
          </section>
        );
      })}
    </>
  );
}
