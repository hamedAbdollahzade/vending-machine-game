import { useEffect, useRef } from 'react';
import clsx from 'clsx';

/** @typedef {{as?:string, model?:object, children?:import('react').ReactNode, onAction?:function, onClose?:function}} GameNodeProps */
/** Renders an accessible view-model node without exposing the game engine to DOM mutations.
 * @param {GameNodeProps} props - Plain presentation properties and callbacks.
 * @returns {import('react').ReactElement} Native element.
 */
export function GameNode({ as: Tag = 'div', model = {}, children, onAction, onClose, ...props }) {
  const ref = useRef(null);
  useEffect(() => {
    if (Tag !== 'dialog' || !ref.current) return;
    if (model.open && !ref.current.open) ref.current.showModal();
    if (!model.open && ref.current.open) ref.current.close();
  }, [Tag, model.open]);
  const activeClasses = Object.entries(model.classes ?? {})
    .filter(([, active]) => active)
    .map(([name]) => name);
  const selected = model.selected ?? props['aria-selected'];
  const hidden = model.hidden ?? props.hidden;
  return (
    <Tag
      {...props}
      ref={ref}
      hidden={hidden}
      disabled={model.disabled ?? props.disabled}
      className={clsx(model.className ?? props.className, activeClasses, {
        on: model.pressed === true,
      })}
      style={model.style}
      src={model.src ?? props.src}
      aria-pressed={model.pressed ?? props['aria-pressed']}
      aria-selected={selected}
      onClick={onAction}
      onCancel={onClose}
      onClose={Tag === 'dialog' ? onClose : undefined}
    >
      {model.text ?? children}
    </Tag>
  );
}
