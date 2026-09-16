/**
 * Cleans amenity values and snaps them to existing catalogue casing.
 *
 * Deliberately never rejects. The amenity list is derived from existing properties
 * (`SELECT DISTINCT jsonb_array_elements_text(amenities)`), not curated, so
 * rejecting unknown values would make it impossible to ever introduce a new one —
 * and would make bulk import stricter than the form it replaces.
 */
export function normaliseAmenities(raw: string[], known: string[]): string[] {
    const canonical = new Map(known.map(k => [k.toLowerCase(), k]));
    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of raw) {
        const cleaned = value.trim().replace(/\s+/g, ' ');
        if (!cleaned) continue;
        const key = cleaned.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(canonical.get(key) ?? cleaned);
    }

    return result;
}
