import { publishInterface } from '../store/slices/interfaceSlice.js';
import { publishProgress } from '../store/slices/gameSlice.js';

/** Bridges the high-frequency renderer and React using serializable, batched snapshots.
 * @param {object} store - Application Redux store.
 * @returns {object} View publication and action registration API.
 */
export function createInterfaceBridge(store) {
  let nodes = {
      briefing: {
        hidden: false,
      },
      hud: {
        hidden: true,
      },
    },
    actions = new Map(),
    timer = null,
    disposed = false;
  /** Publishes at most ten interface frames per second, independently of WebGL FPS. */
  function flush() {
    timer = null;
    if (!disposed) store.dispatch(publishInterface(structuredClone(nodes)));
  }
  /** Merges a node view model, scheduling only actual changes. */
  function patch(id, values) {
    const previous = nodes[id] ?? {};
    if (Object.keys(values).every((key) => Object.is(previous[key], values[key]))) return;
    nodes = {
      ...nodes,
      [id]: {
        ...previous,
        ...values,
      },
    };
    if (timer === null && !disposed) timer = setTimeout(flush, 100);
  }
  return {
    activate() {
      disposed = false;
    },
    patch,
    read: (id) => nodes[id] ?? {},
    open: (id) =>
      patch(id, {
        open: true,
      }),
    close: (id) =>
      patch(id, {
        open: false,
      }),
    on: (id, handler) => actions.set(id, handler),
    emit: (id, value) => actions.get(id)?.(value),
    style: (id, style) =>
      patch(id, {
        style: {
          ...nodes[id]?.style,
          ...style,
        },
      }),
    classState: (id, name, on) =>
      patch(id, {
        classes: {
          ...nodes[id]?.classes,
          [name]: on,
        },
      }),
    publishGame: (state) => store.dispatch(publishProgress(structuredClone(state))),
    clearActions: () => actions.clear(),
    dispose() {
      disposed = true;
      clearTimeout(timer);
      actions.clear();
    },
  };
}
