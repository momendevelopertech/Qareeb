export function formatLocationParts(parts: Array<string | null | undefined>, separator = ' — '): string {
    const cleaned = parts
        .map((value) => (value || '').toString().trim())
        .filter(Boolean);

    const unique: string[] = [];
    for (const part of cleaned) {
        if (!unique.some((existing) => existing.localeCompare(part, undefined, { sensitivity: 'base' }) === 0)) {
            unique.push(part);
        }
    }

    return unique.join(separator);
}
