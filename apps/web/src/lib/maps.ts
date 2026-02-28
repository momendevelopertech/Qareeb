const extractLatLngFromUrlString = (url: string): { lat: number; lng: number } | null => {
    try {
        const decoded = decodeURIComponent(url);
        const searchMatch = decoded.match(/\/maps\/search\/(-?\d+\.\d+)[,+]\s*(-?\d+\.\d+)/);
        if (searchMatch) return { lat: parseFloat(searchMatch[1]), lng: parseFloat(searchMatch[2]) };

        const atMatch = decoded.match(/@(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

        const qMatch = decoded.match(/[?&]q=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

        const dMatch = decoded.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
        if (dMatch) return { lat: parseFloat(dMatch[1]), lng: parseFloat(dMatch[2]) };

        const llMatch = decoded.match(/[?&]ll=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };

        return null;
    } catch {
        return null;
    }
};

export function extractLatLngFromGoogleMaps(rawUrl?: string | null): { lat: number; lng: number } | null {
    if (!rawUrl) return null;
    return extractLatLngFromUrlString(rawUrl);
}

export function getGoogleMapsEmbedUrl(rawUrl?: string | null): string | null {
    if (!rawUrl) return null;
    const coords = extractLatLngFromGoogleMaps(rawUrl);

    if (coords) {
        const q = `${coords.lat},${coords.lng}`;
        return `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed`;
    }

    return `https://www.google.com/maps?output=embed&q=${encodeURIComponent(rawUrl)}`;
}
