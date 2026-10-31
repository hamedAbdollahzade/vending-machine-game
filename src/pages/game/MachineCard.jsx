import { GameNode } from '@/components/shared/GameNode.jsx';
import { COMPANY } from '@/config/company.js';
import { strings } from '@/i18n/fa.js';
import { showroomModelById, formatRial } from '@/utils/showroomAnswers.js';

/** @typedef {{nodes: object, actions: object}} MachineCardProps */
/**
 * Card for an installed machine: where it stands, which model it is, key specs, and an order
 * request button (a mission step) with the sales contact.
 * @param {MachineCardProps} props - Interface snapshots and actions.
 * @returns {import('react').ReactElement} Dialog.
 */
export function MachineCard({ nodes, actions }) {
  const card = nodes['machine-card'] ?? {};
  const model = showroomModelById(card.modelId);
  const text = strings.machineCard;

  return (
    <GameNode
      as="dialog"
      id="machine-card"
      aria-labelledby="machine-card-title"
      className="info-sheet"
      model={{ open: card.open }}
      onClose={() => actions.emit('machine-card-close')}
    >
      <h2 id="machine-card-title" className="mb-3 text-lg font-bold">
        {model?.name ?? text.title}
      </h2>
      <dl className="mb-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="opacity-70">{text.installedAt}</dt>
        <dd>{card.site}</dd>
        <dt className="opacity-70">{text.price}</dt>
        <dd className="text-gold">{model && formatRial(model.priceNumeric)}</dd>
      </dl>
      <p className="opacity-90">{model?.description}</p>
      <ul className="my-3 list-inside list-disc">
        {model?.highlights.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          id="machine-order"
          className="start-option start-option-primary"
          disabled={card.ordered}
          onClick={() => actions.emit('machine-order')}
        >
          {card.ordered ? text.ordered : text.order}
        </button>
        <a className="start-chip" href={`tel:${COMPANY.contact.phone}`}>
          {text.contact}
        </a>
        <button
          type="button"
          className="start-chip"
          onClick={() => actions.emit('machine-card-close')}
        >
          {text.close}
        </button>
      </div>
    </GameNode>
  );
}
