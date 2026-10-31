import { useEffect, useRef } from 'react';
import { strings } from '@/i18n/fa.js';
import { StartIcon } from './StartIcon.jsx';
import { SECTION_BODIES } from './InfoSectionContent.jsx';

/** @typedef {{section: string | null, onClose: function}} InfoSheetProps */
/**
 * Shows one company information section in a modal sheet (bottom sheet on phones).
 * @param {InfoSheetProps} props - Open section key, or null when closed, and the close callback.
 * @returns {import('react').ReactElement} Native dialog.
 */
export function InfoSheet({ section, onClose }) {
  const dialog = useRef(null);
  const Body = SECTION_BODIES[section];
  const title = section === 'about' ? strings.landing.history : strings.landing.sections[section];

  // The native dialog gives focus trapping and Escape handling; keep it in step with `section`.
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (section && !element.open) element.showModal();
    if (!section && element.open) element.close();
  }, [section]);

  return (
    <dialog
      ref={dialog}
      id="info-sheet"
      aria-labelledby="info-sheet-title"
      onClose={onClose}
      className="info-sheet"
    >
      <header className="mb-4 flex items-center justify-between gap-4">
        <h2 id="info-sheet-title" className="text-lg font-bold">
          {title}
        </h2>
        <button
          type="button"
          className="start-icon-button"
          aria-label={strings.landing.close}
          onClick={onClose}
        >
          <StartIcon name="close" className="h-5 w-5" />
        </button>
      </header>
      {Body && <Body />}
    </dialog>
  );
}
