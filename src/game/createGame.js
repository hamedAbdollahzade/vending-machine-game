import { bindRuntime, RUNTIME_INITIALIZERS } from './runtime/runtimeBindings.js';
/** Starts isolated systems in dependency order and returns their shared lifecycle cleanup.
 * Reports start-up progress (0–1) on the `loading` interface node as each system is ready.
 * @param {{root:HTMLElement,ui:object,signal:AbortSignal,startMode?:string}} options - React
 * mount context, and a start mode that skips the start screen.
 * @returns {Promise<function>} Disposes input, timers, sensors and graphics.
 */
export async function createGame({ root, ui, signal, startMode }) {
  const context = {
    root,
    ui,
    signal,
    startMode: null,
    requestedMode: startMode ?? null,
  };
  bindRuntime(context);
  try {
    for (const [index, initialize] of RUNTIME_INITIALIZERS.entries()) {
      if (signal.aborted) break;
      await initialize(context);
      ui.patch('loading', { progress: (index + 1) / RUNTIME_INITIALIZERS.length });
    }
  } catch (error) {
    context.renderer?.dispose();
    throw error;
  }
  return context.dispose ?? (() => context.renderer?.dispose());
}
