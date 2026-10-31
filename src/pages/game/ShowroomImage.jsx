import { useState } from 'react';
import { strings } from '@/i18n/fa.js';

/** @typedef {{model:object}} ShowroomImageProps */
/** Shows supplied catalog assets, with an explicit fallback while files are unavailable.
 * @param {ShowroomImageProps} props - Selected catalog model.
 * @returns {import('react').ReactElement} Product preview and variant selection.
 */
export function ShowroomImage({ model }) {
  const [variant, setVariant] = useState('image');
  const [failed, setFailed] = useState({});
  const path = model[variant];
  const unavailable = failed[path];
  const src = new URL(path, document.baseURI).href;
  return (
    <div className="grid gap-3">
      {unavailable ? (
        <div
          className="grid min-h-40 place-content-center rounded border border-white/20 p-4 text-center text-hud"
          role="status"
        >
          {strings.showroom.noImage}
        </div>
      ) : (
        <img
          className="mx-auto max-h-64 max-w-full object-contain"
          src={src}
          alt={`${model.name} · ${strings.showroom.views[variant]}`}
          onError={() =>
            setFailed((previous) => ({
              ...previous,
              [path]: true,
            }))
          }
        />
      )}
      <div className="flex flex-wrap gap-2">
        {Object.entries(strings.showroom.views).map(([key, label]) => (
          <button
            className="rounded border border-white/20 px-3 py-2"
            key={key}
            type="button"
            aria-pressed={variant === key}
            onClick={() => setVariant(key)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
