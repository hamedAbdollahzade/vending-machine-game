import { bindRuntime, RUNTIME_INITIALIZERS } from './runtime/runtimeBindings.js';
/** Starts isolated systems in dependency order and returns their shared lifecycle cleanup.
 * @param {{root:HTMLElement,ui:object,signal:AbortSignal}} options - React mount context.
 * @returns {Promise<function>} Disposes input, timers, sensors and graphics.
 */
export async function createGame({ root, ui, signal }) {
  const context = {
    root,
    ui,
    signal,
  };
  bindRuntime(context);
  try {
    for (const initialize of RUNTIME_INITIALIZERS) {
      if (signal.aborted) break;
      await initialize(context);
    }
  } catch (error) {
    context.renderer?.dispose();
    throw error;
  }
  return context.dispose ?? (() => context.renderer?.dispose());
}
