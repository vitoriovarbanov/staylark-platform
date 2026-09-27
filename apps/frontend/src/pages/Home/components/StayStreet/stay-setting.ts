import type { Property } from '@staylark/contract';

export type StaySetting = 'city' | 'coast' | 'mountain' | 'countryside';

const SETTING_WORDS: [StaySetting, RegExp][] = [
    ['coast', /\b(beach|beaches|seaside|sea|coast|coastal|ocean|bay|seafront)\b/i],
    ['mountain', /\b(ski|skiing|slopes?|mountains?|alpine|alps|peaks?|chalet)\b/i],
    ['countryside', /\b(village|countryside|rural|vineyards?|farm|farmhouse|cottage|lake|lakeside|meadows?)\b/i]
];

export function staySetting(property: Pick<Property, 'title' | 'description' | 'amenities'>): StaySetting {
    const text = [property.title, property.description, ...property.amenities.map(a => a.replace(/-/g, ' '))].join(' ');
    return SETTING_WORDS.find(([, words]) => words.test(text))?.[0] ?? 'city';
}
