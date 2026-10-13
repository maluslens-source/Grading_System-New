/**
 * Register the production service worker for Malus Lens PWA.
 * CRA only emits service-worker.js on `npm run build` (not on `npm start`).
 */

const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
    window.location.hostname === "[::1]" ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)){3}$/)
);

/**
 * @param {{ onSuccess?: (reg: ServiceWorkerRegistration) => void, onUpdate?: (reg: ServiceWorkerRegistration) => void }} [config]
 */
export function register(config) {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
    return;
  }

  const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
  if (publicUrl.origin !== window.location.origin) {
    // CDN / different origin — skip SW
    return;
  }

  window.addEventListener("load", () => {
    const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

    if (isLocalhost) {
      checkValidServiceWorker(swUrl, config);
      navigator.serviceWorker.ready.then(() => {
        // eslint-disable-next-line no-console
        console.info("[PWA] Service worker ready (localhost). App shell can be cached.");
      });
    } else {
      registerValidSW(swUrl, config);
    }
  });
}

/**
 * @param {string} swUrl
 * @param {{ onSuccess?: Function, onUpdate?: Function }} [config]
 */
function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          if (installingWorker.state !== "installed") return;

          if (navigator.serviceWorker.controller) {
            // New content available; tabs still on old SW until refresh
            // eslint-disable-next-line no-console
            console.info("[PWA] Update available — reload to get the new version.");
            if (config && config.onUpdate) config.onUpdate(registration);
          } else {
            // eslint-disable-next-line no-console
            console.info("[PWA] Content cached for offline use.");
            if (config && config.onSuccess) config.onSuccess(registration);
          }
        };
      };
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error("[PWA] Service worker registration failed:", error);
    });
}

/**
 * @param {string} swUrl
 * @param {{ onSuccess?: Function, onUpdate?: Function }} [config]
 */
function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl, { headers: { "Service-Worker": "script" } })
    .then((response) => {
      const contentType = response.headers.get("content-type");
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf("javascript") === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      // eslint-disable-next-line no-console
      console.info("[PWA] Offline mode — no network; using cache if available.");
    });
}

export function unregister() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready
    .then((registration) => {
      registration.unregister();
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error(error.message);
    });
}
