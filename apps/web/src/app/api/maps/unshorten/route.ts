import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTS = new Set([
    'maps.app.goo.gl',
    'goo.gl',
    'www.google.com',
    'google.com',
    'maps.google.com',
]);

function extractCoordinates(url: string): { lat: string; lng: string } | null {
    try {
        const decoded = decodeURIComponent(url);
        // Pattern: /maps/search/<lat>,<lng>
        const searchMatch = decoded.match(/\/maps\/search\/(-?\d+\.\d+)[,+]\s*(-?\d+\.\d+)/);
        if (searchMatch) return { lat: searchMatch[1], lng: searchMatch[2] };

        // @lat,lng
        const atMatch = decoded.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (atMatch) return { lat: atMatch[1], lng: atMatch[2] };

        // q=lat,lng
        const qMatch = decoded.match(/[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (qMatch) return { lat: qMatch[1], lng: qMatch[2] };

        // !3dLAT!4dLNG
        const dMatch = decoded.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
        if (dMatch) return { lat: dMatch[1], lng: dMatch[2] };
    } catch {
        return null;
    }
    return null;
}

const buildMapsUrl = (lat: string, lng: string) =>
    `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const url = body?.url as string | undefined;
        if (!url) return NextResponse.json({ message: 'url is required' }, { status: 400 });

        const host = (() => {
            try { return new URL(url).host; } catch { return null; }
        })();
        if (!host || !ALLOWED_HOSTS.has(host)) {
            return NextResponse.json({ message: 'Invalid URL host' }, { status: 422 });
        }

        // follow redirects with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        let res: Response;
        try {
            res = await fetch(url, { redirect: 'follow', signal: controller.signal });
        } finally {
            clearTimeout(timeout);
        }
        if (!res.ok) return NextResponse.json({ message: 'Failed to resolve URL' }, { status: 502 });

        let effectiveUrl = res.url;

        // Handle consent.google.com redirect wrapping
        try {
            const parsed = new URL(effectiveUrl);
            if (parsed.host.includes('consent.google.com') && parsed.searchParams.get('continue')) {
                effectiveUrl = parsed.searchParams.get('continue') as string;
            }
        } catch {
            /* ignore */
        }

        const coords = extractCoordinates(effectiveUrl);
        const finalUrl = coords ? buildMapsUrl(coords.lat, coords.lng) : effectiveUrl;

        return NextResponse.json({ finalUrl });
    } catch (e: any) {
        if (e?.name === 'AbortError') {
            return NextResponse.json({ message: 'Timeout resolving URL' }, { status: 504 });
        }
        return NextResponse.json({ message: 'Failed to resolve URL' }, { status: 502 });
    }
}
