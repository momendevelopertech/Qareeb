type Coordinates = {
    lat: number;
    lng: number;
};

type ResolveLocationInput = {
    googleMapsUrl?: string | null;
    manualLat?: number | null;
    manualLng?: number | null;
};

type ResolveLocationResult = {
    googleMapsUrl: string | null;
    coordinates: Coordinates;
};

const GOOGLE_MAPS_ALLOWED_HOSTS = new Set([
    'maps.app.goo.gl',
    'goo.gl',
    'google.com',
    'www.google.com',
    'maps.google.com',
    'maps.google.co.uk',
]);

const GOOGLE_GEOCODING_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json';

const roundTo6 = (value: number) => Number(value.toFixed(6));

const isFiniteNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);

const normalizeUrl = (raw: string): string | null => {
    const value = raw.trim();
    if (!value) return null;

    try {
        const parsed = new URL(value);
        if (!['http:', 'https:'].includes(parsed.protocol)) return null;
        return parsed.toString();
    } catch {
        try {
            const parsed = new URL(`https://${value}`);
            if (!['http:', 'https:'].includes(parsed.protocol)) return null;
            return parsed.toString();
        } catch {
            return null;
        }
    }
};

const isGoogleMapsUrl = (url: string): boolean => {
    try {
        const host = new URL(url).host.toLowerCase();
        return GOOGLE_MAPS_ALLOWED_HOSTS.has(host) || host.endsWith('.google.com');
    } catch {
        return false;
    }
};

const extractCoordinatesFromQueryLike = (value: string | null): Coordinates | null => {
    if (!value) return null;
    const match = decodeURIComponent(value).match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
    if (!match) return null;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    return validateCoordinates({ lat, lng });
};

export function validateCoordinates(input?: Partial<Coordinates> | null): Coordinates | null {
    const lat = Number(input?.lat);
    const lng = Number(input?.lng);
    if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return null;
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
            const candidate = validateCoordinates({
                lat: Number(match[1]),
                lng: Number(match[2]),
            });
            if (candidate) return candidate;
        }

        const parsed = new URL(url);
        const queryCandidates = [
            parsed.searchParams.get('q'),
            parsed.searchParams.get('query'),
            parsed.searchParams.get('ll'),
            parsed.searchParams.get('daddr'),
            parsed.searchParams.get('destination'),
        ];

        for (const candidate of queryCandidates) {
            const coords = extractCoordinatesFromQueryLike(candidate);
            if (coords) return coords;
        }

        return null;
    } catch {
        return null;
    }
}

async function resolveRedirect(url: string): Promise<string | null> {
    if (!isGoogleMapsUrl(url)) return null;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        let response: Response;
        try {
            response = await fetch(url, { redirect: 'follow', signal: controller.signal });
        } finally {
            clearTimeout(timeout);
        }

        if (!response.ok) return null;
        const finalUrl = response.url;

        try {
            const parsed = new URL(finalUrl);
            if (parsed.host.includes('consent.google.com') && parsed.searchParams.get('continue')) {
                return parsed.searchParams.get('continue');
            }
        } catch {
            return finalUrl;
        }

        return finalUrl;
    } catch {
        return null;
    }
}

const extractGeocodeCandidate = (url: string): string | null => {
    try {
        const parsed = new URL(url);
        const fromQuery = [
            parsed.searchParams.get('q'),
            parsed.searchParams.get('query'),
            parsed.searchParams.get('daddr'),
            parsed.searchParams.get('destination'),
        ].find((value) => value && !extractCoordinatesFromQueryLike(value));
        if (fromQuery) return decodeURIComponent(fromQuery);

        const placeMatch = decodeURIComponent(parsed.pathname).match(/\/place\/([^/]+)/);
        if (placeMatch?.[1]) return placeMatch[1].replace(/\+/g, ' ');

        return null;
    } catch {
        return null;
    }
};

async function geocodeAddressToCoordinates(address: string): Promise<Coordinates | null> {
    const apiKey = process.env.GOOGLE_GEOCODING_API_KEY;
    if (!apiKey || !address.trim()) return null;

    try {
        const endpoint = new URL(GOOGLE_GEOCODING_ENDPOINT);
        endpoint.searchParams.set('address', address.trim());
        endpoint.searchParams.set('key', apiKey);

        const response = await fetch(endpoint.toString());
        if (!response.ok) return null;

        const payload = await response.json() as {
            status?: string;
            results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
        };

        if (payload.status !== 'OK') return null;
        const first = payload.results?.[0]?.geometry?.location;
        return validateCoordinates({ lat: first?.lat, lng: first?.lng });
    } catch {
        return null;
    }
}

export async function resolveCoordinatesFromGoogleMapsUrl(rawUrl?: string | null): Promise<{
    normalizedUrl: string | null;
    coordinates: Coordinates | null;
}> {
    if (!rawUrl?.trim()) {
        return { normalizedUrl: null, coordinates: null };
    }

    const normalizedUrl = normalizeUrl(rawUrl);
    if (!normalizedUrl) {
        return { normalizedUrl: null, coordinates: null };
    }
    if (!isGoogleMapsUrl(normalizedUrl)) {
        return { normalizedUrl: null, coordinates: null };
    }

    let coordinates = extractCoordinatesFromUrl(normalizedUrl);
    let effectiveUrl = normalizedUrl;

    if (!coordinates) {
        const redirected = await resolveRedirect(normalizedUrl);
        if (redirected) {
            const redirectedNormalized = normalizeUrl(redirected);
            if (redirectedNormalized) {
                effectiveUrl = redirectedNormalized;
                coordinates = extractCoordinatesFromUrl(redirectedNormalized);
            }
        }
    }

    if (!coordinates) {
        const geocodeCandidate = extractGeocodeCandidate(effectiveUrl);
        if (geocodeCandidate) {
            coordinates = await geocodeAddressToCoordinates(geocodeCandidate);
        }
    }

    return {
        normalizedUrl: effectiveUrl,
        coordinates,
    };
}

export async function resolveSubmissionLocation(input: ResolveLocationInput): Promise<ResolveLocationResult | null> {
    const manualCoordinates = validateCoordinates({
        lat: input.manualLat ?? undefined,
        lng: input.manualLng ?? undefined,
    });

    let extractedCoordinates: Coordinates | null = null;
    let normalizedUrl: string | null = null;

    if (input.googleMapsUrl?.trim()) {
        const resolved = await resolveCoordinatesFromGoogleMapsUrl(input.googleMapsUrl);
        normalizedUrl = resolved.normalizedUrl;
        extractedCoordinates = resolved.coordinates;
        if (!normalizedUrl) return null;
    }

    const finalCoordinates = manualCoordinates || extractedCoordinates;
    if (!finalCoordinates) return null;

    return {
        googleMapsUrl: normalizedUrl || generateGoogleMapsLink(finalCoordinates),
        coordinates: finalCoordinates,
    };
}
