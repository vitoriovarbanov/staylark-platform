import { lookupCityGeo, type TravelStats } from '@staylark/contract';

interface StayRow {
    checkIn: Date;
    checkOut: Date;
    property: { city: string };
}

const MS_PER_DAY = 86_400_000;
const nightsBetween = (a: Date, b: Date) => Math.max(0, Math.round((b.getTime() - a.getTime()) / MS_PER_DAY));

export function aggregateTravelStats(stays: StayRow[]): TravelStats {
    const byCity = new Map<string, { nights: number; lastStay: Date; first: Date }>();
    for (const s of stays) {
        const city = s.property.city;
        const nights = nightsBetween(s.checkIn, s.checkOut);
        const cur = byCity.get(city);
        if (cur) {
            cur.nights += nights;
            if (s.checkOut > cur.lastStay) cur.lastStay = s.checkOut;
            if (s.checkIn < cur.first) cur.first = s.checkIn;
        } else {
            byCity.set(city, { nights, lastStay: s.checkOut, first: s.checkIn });
        }
    }

    const journey = [...byCity.entries()]
        .map(([city, v]) => ({ city, nights: v.nights, lastStay: v.lastStay.toISOString(), first: v.first }))
        .sort((a, b) => a.first.getTime() - b.first.getTime())
        .map(({ city, nights, lastStay }) => ({ city, nights, lastStay }));

    const byCountry = new Map<string, { flag: string; cities: number; nights: number }>();
    for (const [city, v] of byCity) {
        const geo = lookupCityGeo(city);
        const cur = byCountry.get(geo.country);
        if (cur) {
            cur.cities += 1;
            cur.nights += v.nights;
        } else {
            byCountry.set(geo.country, { flag: geo.flag, cities: 1, nights: v.nights });
        }
    }

    const perCountry = [...byCountry.entries()]
        .map(([country, v]) => ({ country, ...v }))
        .sort((a, b) => b.nights - a.nights);

    return {
        countries: byCountry.size,
        cities: byCity.size,
        nights: [...byCity.values()].reduce((sum, v) => sum + v.nights, 0),
        perCountry,
        journey
    };
}
