export type Coordinates = {
    lat: number;
    lng: number;
};

const roundTo6 = (value: number) => Number(value.toFixed(6));

export function validateCoordinates(input?: Partial<Coordinates> | null): Coordinates | null {
    const lat = Number(input?.lat);
    const lng = Number(input?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90) return null;
    if (lng < -180 || lng > 180) return null;
    return { lat: roundTo6(lat), lng: roundTo6(lng) };
}

export function generateGoogleMapsLink(input: Coordinates): string {
    const normalized = validateCoordinates(input);
    if (!normalized) throw new Error('Invalid coordinates');
    return `https://www.google.com/maps?q=${normalized.lat},${normalized.lng}`;
}

export function calculateDistance(a: Coordinates, b: Coordinates): number {
    const p1 = validateCoordinates(a);
    const p2 = validateCoordinates(b);
    if (!p1 || !p2) return Number.NaN;

    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371e3;
    const dLat = toRad(p2.lat - p1.lat);
    const dLng = toRad(p2.lng - p1.lng);
    const lat1 = toRad(p1.lat);
    const lat2 = toRad(p2.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function extractCoordinatesFromUrl(url: string): Coordinates | null {
    try {
        const decoded = decodeURIComponent(url);
        const patterns = [
            /\/maps\/search\/(-?\d+(?:\.\d+)?)[,+]\s*(-?\d+(?:\.\d+)?)/,
            /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
            /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
            /\/dir\/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
        ];

        for (const pattern of patterns) {
            const match = decoded.match(pattern);
            if (!match) continue;
            const candidate = validateCoordinates({ lat: Number(match[1]), lng: Number(match[2]) });
            if (candidate) return candidate;
        }

        const parsed = new URL(url);
        const queryValues = [
            parsed.searchParams.get('q'),
            parsed.searchParams.get('query'),
            parsed.searchParams.get('ll'),
            parsed.searchParams.get('daddr'),
            parsed.searchParams.get('destination'),
        ];

        for (const value of queryValues) {
            if (!value) continue;
            const queryMatch = decodeURIComponent(value).match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
            if (!queryMatch) continue;
            const candidate = validateCoordinates({
                lat: Number(queryMatch[1]),
                lng: Number(queryMatch[2]),
            });
            if (candidate) return candidate;
        }

        return null;
    } catch {
        return null;
    }
}

export function extractLatLngFromGoogleMaps(rawUrl?: string | null): Coordinates | null {
    if (!rawUrl) return null;
    return extractCoordinatesFromUrl(rawUrl);
}

const parseResolvedMapsPayload = (payload: unknown): string | null => {
    if (!payload || typeof payload !== 'object') return null;
    const value = (payload as { finalUrl?: unknown }).finalUrl;
    return typeof value === 'string' ? value : null;
};

export async function resolveCoordinatesFromGoogleMapsInput(rawUrl?: string | null): Promise<{
    finalUrl: string | null;
    coordinates: Coordinates | null;
}> {
    if (!rawUrl?.trim()) {
        return { finalUrl: null, coordinates: null };
    }

    const initialCoords = extractCoordinatesFromUrl(rawUrl);
    if (initialCoords) {
        return {
            finalUrl: rawUrl.trim(),
            coordinates: initialCoords,
        };
    }

    try {
        const response = await fetch('/api/maps/unshorten', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: rawUrl.trim() }),
        });

        if (!response.ok) {
            return { finalUrl: rawUrl.trim(), coordinates: null };
        }

        const payload = await response.json();
        const finalUrl = parseResolvedMapsPayload(payload) || rawUrl.trim();
        return {
            finalUrl,
            coordinates: extractCoordinatesFromUrl(finalUrl),
        };
    } catch {
        return {
            finalUrl: rawUrl.trim(),
            coordinates: null,
        };
    }
}

export function getGoogleMapsEmbedUrl(rawUrl?: string | null): string | null {
    if (!rawUrl) return null;
    const coords = extractCoordinatesFromUrl(rawUrl);
    if (coords) {
        return `https://www.google.com/maps?q=${coords.lat},${coords.lng}&z=15&output=embed`;
    }
    return `https://www.google.com/maps?output=embed&q=${encodeURIComponent(rawUrl)}`;
}
