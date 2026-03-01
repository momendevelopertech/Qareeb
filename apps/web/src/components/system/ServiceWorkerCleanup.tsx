'use client';

import { useEffect } from 'react';

export default function ServiceWorkerCleanup() {
    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        const clearLegacyServiceWorkers = async () => {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                if (!registrations.length) return;

                await Promise.all(registrations.map((registration) => registration.unregister()));

                if ('caches' in window) {
                    const cacheKeys = await caches.keys();
                    await Promise.all(cacheKeys.map((key) => caches.delete(key)));
                }
            } catch {
                // Intentionally silent to avoid runtime noise for users.
            }
        };

        void clearLegacyServiceWorkers();
    }, []);

    return null;
}
