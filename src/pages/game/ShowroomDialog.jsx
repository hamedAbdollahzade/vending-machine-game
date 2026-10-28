import { GameNode } from '@/components/shared/GameNode.jsx';
import { SHOWROOM_CATALOG } from '@/constants/showroomCatalog.js';
import { showroomModelById, formatRial } from '@/utils/showroomAnswers.js';
import { ShowroomImage } from './ShowroomImage.jsx';

/** @typedef {{nodes:object,actions:object}} ShowroomDialogProps */
/** Presents the factory sample catalog and questions answered by the robot host.
 * @param {ShowroomDialogProps} props - Showroom state and game commands.
 * @returns {import('react').ReactNode} Sample dialog, or null before a sample is selected.
 */
export function ShowroomDialog({ nodes, actions }) {
  const model = showroomModelById(nodes.showroom?.modelId);
  if (!model) return null;
  return (
    <GameNode
      as="dialog"
      id="showroom"
      model={nodes.showroom}
      onClose={() => actions.close('showroom')}
      aria-labelledby="showroom-title"
      className="w-[min(92vw,52rem)] max-h-[90dvh] overflow-y-auto rounded-xl border border-white/20 bg-surface p-6 text-hud"
    >
      <header className="mb-5 flex items-center justify-between gap-4">
        <h2 id="showroom-title" className="text-xl font-bold">
          نمایشگاه کارخانه · {model.name}
        </h2>
        <button
          type="button"
          aria-label="بستن معرفی دستگاه"
          onClick={() => actions.close('showroom')}
        >
          ✕
        </button>
      </header>
      <nav aria-label="مدل دستگاه" className="mb-5 flex flex-wrap gap-3">
        {SHOWROOM_CATALOG.map((item) => (
          <button
            key={item.id}
            className="rounded border border-teal px-4 py-2"
            type="button"
            aria-pressed={item.id === model.id}
            onClick={() => actions.emit('showroom-select', item.id)}
          >
            {item.shortLabel}
          </button>
        ))}
      </nav>
      <div className="grid gap-6 md:grid-cols-2">
        <ShowroomImage key={model.id} model={model} />
        <section>
          <h3 className="mb-3 text-lg font-semibold">{model.name}</h3>
          <p className="mb-3 text-gold">قیمت خود دستگاه: {formatRial(model.priceNumeric)}</p>
          <p>{model.description}</p>
          <ul className="my-4 list-inside list-disc">
            {model.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-sm opacity-75">
            این بخش معرفی محصول است؛ خرید واقعی انجام نمی‌شود و بودجهٔ هتومان تغییر نمی‌کند.
          </p>
        </section>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="rounded bg-teal px-4 py-3 font-bold text-surface"
          type="button"
          onClick={() =>
            actions.emit('showroom-question', {
              modelId: model.id,
              topic: 'price',
            })
          }
        >
          روبات، قیمتش چنده؟
        </button>
        <button
          className="rounded border border-teal px-4 py-3"
          type="button"
          onClick={() =>
            actions.emit('showroom-question', {
              modelId: model.id,
              topic: 'features',
            })
          }
        >
          روبات، امکاناتش چیه؟
        </button>
      </div>
      <div className="mt-4 flex items-start gap-3 border-s-2 border-gold ps-4">
        <img
          className="h-16 w-16 shrink-0 object-contain"
          src="./robot/happy.webp"
          alt="روبات راهنمای نمایشگاه"
        />
        <p role="status">
          {nodes['showroom-response']?.text ??
            'روبات: سلام! دربارهٔ قیمت و امکانات این مدل از من بپرس.'}
        </p>
      </div>
    </GameNode>
  );
}
