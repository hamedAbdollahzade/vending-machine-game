import { useEffect, useMemo, useRef } from 'react';
import { useStore } from 'react-redux';
import { useAppSelector } from '@/store/hooks.js';
import { selectNodes } from '@/store/slices/interfaceSlice.js';
import { createInterfaceBridge } from '@/game/interfaceBridge.js';
import { useGameEngine } from '@/hooks/useGameEngine.js';
import { setupPwa } from '@/game/device/pwa.js';
import { GameSurfaces } from './GameSurfaces.jsx';
import { BriefingPanel } from './BriefingPanel.jsx';
import { GameHud } from './GameHud.jsx';
import { GameDialogs } from './GameDialogs.jsx';
import { strings } from '@/i18n/fa.js';

/** Composes React views around the isolated Three.js runtime. */
export function GamePage() {
  const root = useRef(null),
    store = useStore();
  const bridge = useMemo(() => createInterfaceBridge(store), [store]);
  const nodes = useAppSelector(selectNodes);
  const { error } = useGameEngine(root, bridge);
  useEffect(() => {
    bridge.activate();
    const dispose = setupPwa(bridge);
    return () => {
      dispose();
      bridge.dispose();
    };
  }, [bridge]);
  useEffect(() => {
    const classes = nodes.body?.classes ?? {};
    for (const [name, enabled] of Object.entries(classes))
      document.body.classList.toggle(name, enabled);
    return () => {
      for (const name of Object.keys(classes)) document.body.classList.remove(name);
    };
  }, [nodes.body]);
  const props = {
    nodes,
    actions: bridge,
  };
  return (
    <main ref={root}>
      <GameSurfaces {...props} />
      <BriefingPanel {...props} />
      <GameHud {...props} />
      <GameDialogs {...props} />
      {error && (
        <div
          id="engine-error"
          role="alert"
          className="fixed inset-0 z-[100] grid place-content-center bg-surface p-8 text-hud"
        >
          <p>{strings.app.failed(error)}</p>
          <button type="button" onClick={() => location.reload()}>
            {strings.app.retry}
          </button>
        </div>
      )}
    </main>
  );
}
