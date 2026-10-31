import { GameNode } from '@/components/shared/GameNode.jsx';
import { SHOWROOM_CATALOG } from '@/constants/showroomCatalog.js';
import { robotFace } from '@/config/assets.js';
import { COMPANY } from '@/config/company.js';
import { showroomModelById, formatRial } from '@/utils/showroomAnswers.js';
import { ShowroomImage } from './ShowroomImage.jsx';
import { strings } from '@/i18n/fa.js';

/** @typedef {{nodes:object,actions:object}} ShowroomDialogProps */
/** Presents the factory sample catalog and questions answered by the robot host.
 * @param {ShowroomDialogProps} props - Showroom state and game commands.
 * @returns {import('react').ReactNode} Sample dialog, or null before a sample is selected.
 */
export function ShowroomDialog({ nodes, actions }) {
  const model = showroomModelById(nodes.showroom?.modelId);
  if (!model) return null;
  const isOrdered = nodes.showroom.ordered?.includes(model.id) ?? false;
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
          {strings.showroom.heading(model.name)}
        </h2>
        <button
          type="button"
          aria-label={strings.showroom.close}
          onClick={() => actions.close('showroom')}
        >
          ✕
        </button>
      </header>
      <nav aria-label={strings.showroom.models} className="mb-5 flex flex-wrap gap-3">
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
          <p className="mb-3 text-gold">{strings.showroom.price(formatRial(model.priceNumeric))}</p>
          <p>{model.description}</p>
          <ul className="my-4 list-inside list-disc">
            {model.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-sm opacity-75">{strings.showroom.displayOnly}</p>
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
          {strings.showroom.askPrice}
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
          {strings.showroom.askFeatures}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          className="start-option start-option-primary"
          disabled={isOrdered}
          onClick={() => actions.emit('showroom-order')}
        >
          {isOrdered ? strings.showroom.ordered : strings.showroom.order}
        </button>
        <a className="start-chip" href={`tel:${COMPANY.contact.phone}`}>
          {strings.showroom.contact}
        </a>
      </div>
      <div className="mt-4 flex items-start gap-3 border-s-2 border-gold ps-4">
        <img
          className="h-16 w-16 shrink-0 object-contain"
          src={robotFace('happy')}
          alt={strings.showroom.robotAlt}
        />
        <p role="status">{nodes['showroom-response']?.text ?? strings.showroom.greeting}</p>
      </div>
    </GameNode>
  );
}
