const ALLOWED_HOSTS = new Set([
    'maps.app.goo.gl',
    'goo.gl',
    'www.google.com',
    'google.com',
    'maps.google.com',
]);

function extractLatLngFromUrlString(url: string): { lat: number; lng: number } | null {
    try {
        const decoded = decodeURIComponent(url);
        // Pattern: /maps/search/<lat>,<lng>
        const searchMatch = decoded.match(/\/maps\/search\/(-?\d+\.\d+)[,+]\s*(-?\d+\.\d+)/);
        if (searchMatch) return { lat: parseFloat(searchMatch[1]), lng: parseFloat(searchMatch[2]) };
        // Pattern: @lat,lng
        const atMatch = decoded.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
        // Pattern: q=lat,lng
        const qMatch = decoded.match(/[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
        // Pattern: !3dLAT!4dLNG
        const dMatch = decoded.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
        if (dMatch) return { lat: parseFloat(dMatch[1]), lng: parseFloat(dMatch[2]) };
        // Pattern: ll=lat,lng
        const llMatch = decoded.match(/[?&]ll=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
        return null;
    } catch {
        return null;
    }
}

export function extractLatLngFromGoogleMaps(url: string): { lat: number; lng: number } | null {
    return extractLatLngFromUrlString(url);
}

export async function resolveLatLngFromGoogleMaps(url: string): Promise<{ lat: number; lng: number } | null> {
    // First, try direct extraction
    const direct = extractLatLngFromUrlString(url);
    if (direct) return direct;

    // Only follow redirects for known hosts
    let host: string | null = null;
    try { host = new URL(url).host; } catch { host = null; }
    if (!host || !ALLOWED_HOSTS.has(host)) return null;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        let res: Response;
        try {
            res = await fetch(url, { redirect: 'follow', signal: controller.signal });
        } finally {
            clearTimeout(timeout);
        }
        const effectiveUrl = res.url;

        // Handle consent.google.com wrapper
        try {
            const parsed = new URL(effectiveUrl);
            if (parsed.host.includes('consent.google.com') && parsed.searchParams.get('continue')) {
                const cont = parsed.searchParams.get('continue');
                if (cont) {
                    const innerCoords = extractLatLngFromUrlString(cont);
                    if (innerCoords) return innerCoords;
                }
            }
        } catch { /* ignore */ }

        return extractLatLngFromUrlString(effectiveUrl);
    } catch {
        return null;
    }
}
