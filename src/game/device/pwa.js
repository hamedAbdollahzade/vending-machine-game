/** Connects install/update lifecycle to the React interface and returns cleanup.
 * @param {object} ui - Interface bridge.
 * @returns {function} Releases browser event subscriptions.
 */
export function setupPwa(ui) {
  const controller = new AbortController(),
    { signal } = controller;
  let deferred = null,
    reloading = false,
    disposed = false;
  const standalone =
    matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches ||
    navigator.standalone;
  const ios =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!standalone && ios)
    ui.patch('install', {
      hidden: false,
    });
  window.addEventListener(
    'beforeinstallprompt',
    (event) => {
      event.preventDefault();
      deferred = event;
      ui.patch('install', {
        hidden: false,
      });
    },
    {
      signal,
    },
  );
  window.addEventListener(
    'appinstalled',
    () =>
      ui.patch('install', {
        hidden: true,
      }),
    {
      signal,
    },
  );
  ui.on('install', async () => {
    if (deferred) {
      deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      ui.patch('install', {
        hidden: true,
      });
    } else if (ios) ui.open('ios-install');
  });
  ui.on('ios-close', () => ui.close('ios-install'));
  if ('serviceWorker' in navigator && !import.meta.env.DEV) {
    /** Offers a version change only after a worker has installed successfully. */
    const offer = (worker) => {
      ui.patch('update-toast', {
        hidden: false,
      });
      ui.on('update-reload', () => worker.postMessage('skip-waiting'));
    };
    navigator.serviceWorker
      .register('./sw.js')
      .then((registration) => {
        if (disposed) return;
        if (registration.waiting && navigator.serviceWorker.controller) offer(registration.waiting);
        registration.addEventListener(
          'updatefound',
          () => {
            const worker = registration.installing;
            worker?.addEventListener(
              'statechange',
              () => {
                if (worker.state === 'installed' && navigator.serviceWorker.controller)
                  offer(worker);
              },
              {
                signal,
              },
            );
          },
          {
            signal,
          },
        );
      })
      .catch(() => {});
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        if (reloading) return;
        reloading = true;
        location.reload();
      },
      {
        signal,
      },
    );
  }
  return () => {
    disposed = true;
    controller.abort();
  };
}
