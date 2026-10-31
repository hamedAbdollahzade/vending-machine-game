import { useState } from 'react';
import { GameNode } from '@/components/shared/GameNode.jsx';
import { COMPANY } from '@/config/company.js';
import { ASSETS } from '@/config/assets.js';
import { strings } from '@/i18n/fa.js';
import { StartIcon } from './StartIcon.jsx';
import { StartOptions } from './StartOptions.jsx';
import { InfoSheet } from './InfoSheet.jsx';

// Company information links under the start buttons, with their icons.
const SECTIONS = [
  ['about', 'building'],
  ['contact', 'phone'],
  ['address', 'map'],
  ['faq', 'help'],
  ['careers', 'briefcase'],
  ['gallery', 'image'],
  ['social', 'share'],
];

/** @typedef {{nodes: object, actions: object}} StartScreenProps */
/**
 * Landing-page style start screen over the slowly orbiting 3D factory: brand, the four ways
 * into the game, and the company information a website would normally show.
 * @param {StartScreenProps} props - Interface snapshots and actions.
 * @returns {import('react').ReactElement} Start screen.
 */
export function StartScreen({ nodes, actions }) {
  const [section, setSection] = useState(null);
  const text = strings.landing;

  return (
    <GameNode as="section" id="landing" aria-labelledby="landing-title" model={nodes.landing}>
      <div className="landing-panel">
        <header className="flex items-center gap-3">
          <img src={ASSETS.brand.logo} alt={text.logoAlt} className="h-12 w-12 rounded-xl" />
          <div>
            <p className="text-lg font-bold">{COMPANY.shortName}</p>
            <p className="text-sm text-primary">{COMPANY.tagline}</p>
          </div>
        </header>
        <div className="my-6 md:my-10">
          <h1 id="landing-title" className="text-2xl font-black leading-snug md:text-4xl">
            {text.heading}
          </h1>
          <p className="mt-3 max-w-md opacity-80">{text.intro}</p>
        </div>
        <StartOptions actions={actions} />
        <nav aria-label={text.sectionsLabel} className="mt-6 flex flex-wrap gap-2">
          {SECTIONS.map(([key, icon]) => (
            <button key={key} type="button" className="start-chip" onClick={() => setSection(key)}>
              <StartIcon name={icon} className="h-4 w-4" />
              {key === 'about' ? text.history : text.sections[key]}
            </button>
          ))}
          <GameNode
            as="button"
            id="install"
            type="button"
            className="start-chip"
            hidden
            model={nodes.install}
            onAction={() => actions.emit('install')}
          >
            <StartIcon name="download" className="h-4 w-4" />
            {text.install}
          </GameNode>
        </nav>
        <p className="mt-6 hidden text-xs opacity-60 md:block">{text.keys}</p>
      </div>
      <InfoSheet section={section} onClose={() => setSection(null)} />
    </GameNode>
  );
}
