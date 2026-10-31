import { CompanyGame } from '@/pages/game/CompanyGame.jsx';
import { START_MODES } from '@/constants/startModes.js';

/**
 * Reads the embedding options from the address: `?mode=about` starts in a mode, `?poster` shows
 * the light poster first. An iframe on the company site can set them in its src.
 * @returns {{startMode?: string, showPoster: boolean}} CompanyGame props.
 */
function optionsFromUrl() {
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode');
  return {
    startMode: START_MODES.includes(mode) ? mode : undefined,
    showPoster: params.has('poster'),
  };
}

/** The app has one page: the company game, configured from the address. */
export function AppRoutes() {
  return <CompanyGame {...optionsFromUrl()} />;
}
