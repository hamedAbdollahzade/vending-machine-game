// Installable app: registers the offline service worker, offers "install" where the browser allows
// it (Android/desktop Chrome), shows Add-to-Home-Screen steps on iOS, and offers a reload on updates.
const $ = s => document.querySelector(s);

export function setupPwa() {
    const installButton = $('#install');
    const standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    let deferred = null;

    if (!standalone && ios) installButton.hidden = false;
    window.addEventListener('beforeinstallprompt', event => {
        event.preventDefault();
        deferred = event;
        installButton.hidden = false;
    });
    window.addEventListener('appinstalled', () => installButton.hidden = true);
    installButton.onclick = async () => {
        if (deferred) {
            deferred.prompt();
            await deferred.userChoice;
            deferred = null;
            installButton.hidden = true;
        } else if (ios) $('#ios-install').showModal();
    };
    $('#ios-close').onclick = () => $('#ios-install').close();

    // Only built pages have sw.js; the dev server serves source files directly.
    if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
    navigator.serviceWorker.register('./sw.js').then(registration => {
        const offer = worker => {
            $('#update-toast').hidden = false;
            $('#update-reload').onclick = () => worker.postMessage('skip-waiting');
        };
        if (registration.waiting && navigator.serviceWorker.controller) offer(registration.waiting);
        registration.addEventListener('updatefound', () => {
            const worker = registration.installing;
            worker?.addEventListener('statechange', () => {
                if (worker.state === 'installed' && navigator.serviceWorker.controller) offer(worker);
            });
        });
    }).catch(() => {});
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return;
        reloading = true;
        location.reload();
    });
}
