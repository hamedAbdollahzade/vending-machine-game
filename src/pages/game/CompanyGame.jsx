import { Suspense, lazy, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store/index.js';
import { supportsWebgl } from '@/game/device/webgl.js';
import { GamePoster } from './GamePoster.jsx';
import { GameLoader } from './GameLoader.jsx';

// The game page (and Three.js with it) is a separate chunk, fetched only when the game starts.
const GamePage = lazy(() =>
  import('./GamePage.jsx').then((module) => ({ default: module.GamePage })),
);

/**
 * @typedef {object} CompanyGameProps
 * @property {'real' | 'offline' | 'about' | 'products'} [startMode] - Start straight in this mode
 * instead of showing the start screen.
 * @property {boolean} [showPoster] - Show a light poster with an "Enter the game" button first,
 * so the 3D game only loads when the visitor asks (good for landing pages). Default false.
 */
/**
 * The whole company game as one self-contained component: store, loader, poster, no-WebGL
 * fallback and the game itself. Mount it on a full-page route (or in an iframe); the game uses
 * the whole viewport.
 * @param {CompanyGameProps} props - Embedding options.
 * @returns {import('react').ReactElement} Game, poster or fallback.
 */
export function CompanyGame({ startMode, showPoster = false }) {
  const [canRender] = useState(supportsWebgl);
  const [entered, setEntered] = useState(!showPoster);
  if (!canRender || !entered)
    return <GamePoster canRender={canRender} onEnter={() => setEntered(true)} />;
  return (
    <Provider store={store}>
      <Suspense fallback={<GameLoader nodes={{}} />}>
        <GamePage startMode={startMode} />
      </Suspense>
    </Provider>
  );
}
