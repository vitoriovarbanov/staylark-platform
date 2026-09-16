// Shared EUR formatting. One module, two deliberate conventions:
//   - formatEUR: full precision (cents) for individual transaction amounts,
//     matching the rest of the app (booking sidebars, price breakdowns).
//   - formatEURCompact: whole euros for at-a-glance aggregate KPIs (dashboard
//     cards, performance tables) where cents are noise.
// Centralised so the two can't drift into accidental, inconsistent variants.

const eur = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const eurCompact = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export const formatEUR = (value: number) => eur.format(value);
export const formatEURCompact = (value: number) => eurCompact.format(value);
