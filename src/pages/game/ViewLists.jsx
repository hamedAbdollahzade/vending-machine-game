import { formatHetoman } from '@/game/economy/gameState.js';

/** @typedef {{id:string,model?:object,onAction:function}} ViewListsProps */
/** Renders structured game lists as JSX; strings are never interpreted as HTML.
 * @param {ViewListsProps} props - List identifier, snapshot, and command callback.
 * @returns {import('react').ReactNode} List content.
 */
export function ViewLists({ id, model = {}, onAction }) {
  const items = model.items ?? [];
  if (id === 'products')
    return items.map((item) => (
      <button
        key={item.id}
        type="button"
        disabled={Boolean(item.blocked)}
        onClick={() => onAction('select-product', item.id)}
      >
        <span className="icon">{item.icon}</span>
        <b>{item.name}</b>
        <span className="price">{formatHetoman(item.price)}</span>
        {item.price !== item.cost && <s>{formatHetoman(item.cost)}</s>}
        <small>
          {item.type === 'drink' ? 'نوشیدنی' : 'خوراکی'}
          {item.blocked === 'funds' ? ' · موجودی کافی نیست' : ''}
        </small>
      </button>
    ));
  if (id === 'mission-list')
    return items.map((item) => (
      <li key={item.id} className={item.done ? 'done' : item.active ? 'active' : ''}>
        {item.title}
      </li>
    ));
  if (id === 'end-stats')
    return items.map(([label, value]) => (
      <li key={label}>
        <span>{label}</span>
        <b>{value}</b>
      </li>
    ));
  if (id === 'machine-list')
    return items.map((item) => (
      <li key={item.id}>
        <button
          type="button"
          className={item.locked ? 'locked' : item.selected ? 'selected' : ''}
          disabled={item.locked}
          onClick={() => onAction('select-machine', item.id)}
        >
          <span>{item.icon ?? '🔒'}</span>
          <span>
            {item.name}
            {item.visited ? ' ✓' : ''}
            <span className="meta">
              {item.locked ? item.note : `${item.category} · ${item.open ? 'باز' : 'بسته'}`}
            </span>
          </span>
          <span className="dist">{item.distance}</span>
        </button>
      </li>
    ));
  if (id === 'awards')
    return (
      items.length > 0 && (
        <>
          <div className="total">+{model.total?.toLocaleString('fa-IR')}</div>
          {items.map((item) => (
            <div key={item.label} className="line">
              {item.label}
              <b>+{item.points.toLocaleString('fa-IR')}</b>
            </div>
          ))}
        </>
      )
    );
  if (id === 'banner')
    return (
      <>
        <small>{model.tag}</small>
        <strong>{model.title}</strong>
        <span>{model.sub}</span>
      </>
    );
  return null;
}
