import { useEffect, useRef } from 'react';
import { Icon } from './Icon.jsx';

/** @typedef {{id: string, open: boolean, title: string, closeLabel: string, onClose: function,
 * children?: import('react').ReactNode}} SheetProps */
/**
 * Modal panel built on the native dialog (focus trap and Escape for free). Styled by the
 * `.info-sheet` rules: a centred card on wide screens, a bottom sheet on phones.
 * @param {SheetProps} props - Visibility, title, close label and callback, and content.
 * @returns {import('react').ReactElement} Dialog element.
 */
export function Sheet({ id, open, title, closeLabel, onClose, children }) {
  const dialog = useRef(null);

  // Keep the native dialog in step with `open`; closing by Escape reports back through onClose.
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      id={id}
      aria-labelledby={`${id}-title`}
      onClose={onClose}
      className="info-sheet"
    >
      <header className="mb-4 flex items-center justify-between gap-4">
        <h2 id={`${id}-title`} className="text-lg font-bold">
          {title}
        </h2>
        <button
          type="button"
          className="start-icon-button"
          aria-label={closeLabel}
          onClick={onClose}
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
      </header>
      {open && children}
    </dialog>
  );
}
