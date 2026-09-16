export interface CityGeo {
    country: string;
    flag: string;
}

/** City → country/flag. Keys must match Property.city values. Extend as new cities are added. */
export const CITY_COUNTRY: Record<string, CityGeo> = {
    Lisbon: { country: 'Portugal', flag: '🇵🇹' },
    Porto: { country: 'Portugal', flag: '🇵🇹' },
    Barcelona: { country: 'Spain', flag: '🇪🇸' },
    Madrid: { country: 'Spain', flag: '🇪🇸' },
    Paris: { country: 'France', flag: '🇫🇷' },
    Lyon: { country: 'France', flag: '🇫🇷' },
    Amsterdam: { country: 'Netherlands', flag: '🇳🇱' },
    Berlin: { country: 'Germany', flag: '🇩🇪' },
    Copenhagen: { country: 'Denmark', flag: '🇩🇰' },
    Stockholm: { country: 'Sweden', flag: '🇸🇪' },
    Vienna: { country: 'Austria', flag: '🇦🇹' },
    Milan: { country: 'Italy', flag: '🇮🇹' },
    Prague: { country: 'Czechia', flag: '🇨🇿' },
    Budapest: { country: 'Hungary', flag: '🇭🇺' },
    Sofia: { country: 'Bulgaria', flag: '🇧🇬' },
    Plovdiv: { country: 'Bulgaria', flag: '🇧🇬' },
    Varna: { country: 'Bulgaria', flag: '🇧🇬' },
    Bansko: { country: 'Bulgaria', flag: '🇧🇬' },
    Athens: { country: 'Greece', flag: '🇬🇷' },
    Dubrovnik: { country: 'Croatia', flag: '🇭🇷' },
    Bucharest: { country: 'Romania', flag: '🇷🇴' },
    Istanbul: { country: 'Türkiye', flag: '🇹🇷' },
    Dubai: { country: 'United Arab Emirates', flag: '🇦🇪' }
};

const FALLBACK: CityGeo = { country: 'Other', flag: '🌍' };

export function lookupCityGeo(city: string): CityGeo {
    const key = Object.keys(CITY_COUNTRY).find(c => c.toLowerCase() === city.trim().toLowerCase());
    return key ? CITY_COUNTRY[key] : FALLBACK;
}
