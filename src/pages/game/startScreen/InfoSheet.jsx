import { Sheet } from '@/components/shared/Sheet.jsx';
import { strings } from '@/i18n/fa.js';
import { SECTION_BODIES } from './InfoSectionContent.jsx';

/** @typedef {{section: string | null, onClose: function}} InfoSheetProps */
/**
 * Shows one company information section in a sheet.
 * @param {InfoSheetProps} props - Open section key, or null when closed, and the close callback.
 * @returns {import('react').ReactElement} Sheet.
 */
export function InfoSheet({ section, onClose }) {
  const Body = SECTION_BODIES[section];
  const title = section === 'about' ? strings.landing.history : strings.landing.sections[section];
  return (
    <Sheet
      id="info-sheet"
      open={Boolean(section)}
      title={title ?? ''}
      closeLabel={strings.landing.close}
      onClose={onClose}
    >
      {Body && <Body />}
    </Sheet>
  );
}
