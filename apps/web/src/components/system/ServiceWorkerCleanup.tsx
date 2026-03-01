'use client';

import { useEffect } from 'react';

export default function ServiceWorkerCleanup() {
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        const CLEANUP_DONE_KEY = 'qareeb_sw_cleanup_done_v1';
        const CLEANUP_RELOAD_KEY = 'qareeb_sw_cleanup_reload_once_v1';

        if (window.localStorage.getItem(CLEANUP_DONE_KEY) === '1') return;

        const clearLegacyServiceWorkers = async () => {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                if (!registrations.length) {
                    window.localStorage.setItem(CLEANUP_DONE_KEY, '1');
                    return;
                }

                const hadActiveController = Boolean(navigator.serviceWorker.controller);
                let unregisteredAny = false;

                await Promise.all(
                    registrations.map(async (registration) => {
                        const workerUrl =
                            registration.active?.scriptURL ||
                            registration.waiting?.scriptURL ||
                            registration.installing?.scriptURL;

                        if (!workerUrl) return;

                        const script = new URL(workerUrl, window.location.href);
                        if (script.origin !== window.location.origin) return;

                        const ok = await registration.unregister();
                        if (ok) unregisteredAny = true;
                    }),
                );

                if ('caches' in window) {
                    const cacheKeys = await caches.keys();
                    const legacyCachePrefixes = ['workbox', 'next-pwa', 'next-data', 'qareeb'];
                    await Promise.all(
                        cacheKeys
                            .filter((key) => legacyCachePrefixes.some((prefix) => key.toLowerCase().startsWith(prefix)))
                            .map((key) => caches.delete(key)),
                    );
                }

                window.localStorage.setItem(CLEANUP_DONE_KEY, '1');

                if (unregisteredAny && hadActiveController && window.sessionStorage.getItem(CLEANUP_RELOAD_KEY) !== '1') {
                    window.sessionStorage.setItem(CLEANUP_RELOAD_KEY, '1');
                    window.location.reload();
                }
            } catch {
                // Intentionally silent to avoid runtime noise for users.
            }
        };

        const scheduleCleanup = () => {
            if ('requestIdleCallback' in window) {
                (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(
                    () => {
                        void clearLegacyServiceWorkers();
                    },
                    { timeout: 2000 },
                );
                return;
            }

            window.setTimeout(() => {
                void clearLegacyServiceWorkers();
            }, 500);
        };

        scheduleCleanup();
    }, []);

    return null;
}
