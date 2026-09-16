import { lookupCityGeo } from '@staylark/contract';
import type { JourneyStop } from '@staylark/contract';

export interface GroupedCity {
    city: string;
    nights: number;
    isHome: boolean;
}

export interface CountryGroup {
    country: string;
    flag: string;
    nights: number;
    cities: GroupedCity[];
}

/** Distinct countries across the journey — drives the adaptive ribbon-vs-grouped choice. */
export function countryCount(journey: JourneyStop[]): number {
    return new Set(journey.map(s => lookupCityGeo(s.city).country)).size;
}

/**
 * Group journey stops by country for the multi-country view. Countries are
 * ordered by total nights (desc); within a country the home city leads, then
 * cities by nights (desc). Mirrors the passport-stamp ordering.
 */
export function groupJourneyByCountry(journey: JourneyStop[], homeCity: string | null): CountryGroup[] {
    const home = homeCity?.toLowerCase() ?? null;
    const map = new Map<string, CountryGroup>();

    for (const stop of journey) {
        const { country, flag } = lookupCityGeo(stop.city);
        let group = map.get(country);
        if (!group) {
            group = { country, flag, nights: 0, cities: [] };
            map.set(country, group);
        }
        group.nights += stop.nights;
        group.cities.push({ city: stop.city, nights: stop.nights, isHome: home === stop.city.toLowerCase() });
    }

    const groups = [...map.values()];
    for (const group of groups) {
        group.cities.sort((a, b) => (a.isHome === b.isHome ? b.nights - a.nights : a.isHome ? -1 : 1));
    }
    groups.sort((a, b) => b.nights - a.nights);
    return groups;
}
