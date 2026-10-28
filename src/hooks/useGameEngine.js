import { useEffect, useRef, useState } from 'react';

/** Mounts one game runtime and releases its GPU, input, sensor and timer resources.
 * @param {object} root - React ref containing all render surfaces.
 * @param {object} bridge - Interface publisher owned by this page.
 * @returns {{error:string|null}} Startup failure for the accessible loading surface.
 */
export function useGameEngine(root, bridge) {
  const [error, setError] = useState(null);
  const disposeRef = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    /**
     * Runs the start operation for this subsystem.

     * @returns {*} Operation result, when applicable.
     */
    async function start() {
      try {
        const { createGame } = await import('@/game/createGame.js');
        if (controller.signal.aborted) return;
        const dispose = await createGame({
          root: root.current,
          ui: bridge,
          signal: controller.signal,
        });
        if (controller.signal.aborted) dispose();
        else disposeRef.current = dispose;
      } catch (problem) {
        if (!controller.signal.aborted) {
          setError(problem.message);
          controller.abort();
        }
      }
    }
    start();
    // Abort-scoped input and network work must stop before disposing graphics.
    return () => {
      controller.abort();
      disposeRef.current?.();
      disposeRef.current = null;
    };
  }, [root, bridge]);
  return {
    error,
  };
}
