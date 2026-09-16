import {
    createTheme,
    type MantineColorsTuple,
    type CSSVariablesResolver,
    Button,
    Anchor,
    Paper,
    Card
} from '@mantine/core';

// Brand identity: #C86FA5 — kept at index 4 for light accents/backgrounds.
// Buttons use default shade 6 (#963B74) — rich, saturated, clearly active.
const brand: MantineColorsTuple = [
    '#FBF1F7', // 0 — subtle background tint
    '#F5DFEC', // 1 — hover background
    '#EBBFD9', // 2 — light accent / badge bg
    '#DD97C0', // 3 — medium light
    '#C86FA5', // 4 — brand identity ★ (links, highlights, logo)
    '#B3508D', // 5 — transition shade
    '#963B74', // 6 — button default (filled) ★
    '#7C2F60', // 7 — button hover
    '#64264E', // 8 — button pressed / active
    '#4A1B3A' // 9 — darkest — high-contrast text on light bg
];

// Warm amber accent — pricing highlights, badges, featured tags, star ratings.
// Creates visual tension against the plum primary.
const amber: MantineColorsTuple = [
    '#FFF8EB', // 0 — subtle background tint
    '#FEEFC7', // 1 — hover background
    '#FDE29B', // 2 — light accent / badge bg
    '#FBD56E', // 3 — medium light
    '#F5C842', // 4 — bright amber
    '#E8A838', // 5 — brand amber ★ (badges, highlights, pricing)
    '#D49530', // 6 — amber button default
    '#B87A28', // 7 — amber hover
    '#9C6420', // 8 — amber pressed
    '#7A4E18' // 9 — darkest amber
];

export const theme = createTheme({
    primaryColor: 'brand',
    // Use default primaryShade (6) — gives buttons a rich, confident look
    colors: {
        brand,
        amber
    },
    fontFamily: 'Figtree, system-ui, -apple-system, sans-serif',
    headings: {
        fontFamily: 'Outfit, system-ui, -apple-system, sans-serif',
        fontWeight: '700'
    },
    defaultRadius: 'md',
    other: {
        accentColor: '#434343',
        amberAccent: '#E8A838',
        // Brand "deep plum" surface used across heroes, tickets, empty-state panels, etc.
        // Was a desaturated near-black. Shifted to a richer,
        // deeper plum from the logo family — clearly richer than before,
        // but kept deep enough that translucent white secondary text stays legible
        // (full white ~9:1; 70% white ~5:1).
        navyBg: '#4A1B3A',
        surfaceBg: '#F8F9FC',
        surfaceInset: '#F1F3F8',
        textPrimary: '#1E2A3A',
        textSecondary: '#64748B'
    },
    components: {
        Button: Button.extend({
            defaultProps: {
                fw: 600
            },
            styles: {
                root: {
                    transition: 'all 150ms ease'
                }
            },
            // The `subtle` variant is transparent with no border, so secondary
            // actions (modal "Cancel", "Dismiss", "Reopen") read as plain text
            // and lose their affordance. Give them a soft gray hairline border so
            // they clearly present as buttons while staying quieter than filled.
            vars: (_theme, props) => {
                if (props.variant === 'subtle') {
                    return {
                        root: {
                            '--button-bd': '1px solid var(--mantine-color-gray-3)'
                        }
                    };
                }

                return { root: {} };
            }
        }),
        Anchor: Anchor.extend({
            defaultProps: {
                c: 'brand.6'
            }
        }),
        Paper: Paper.extend({
            styles: {
                root: {
                    boxShadow: 'var(--shadow-card)'
                }
            }
        }),
        Card: Card.extend({
            styles: {
                root: {
                    boxShadow: 'var(--shadow-card)'
                }
            }
        })
    }
});

// Maps theme.other values to CSS variables so they're usable in CSS Modules.
// Mantine does NOT auto-generate CSS vars from theme.other — this resolver is required.
export const cssVariablesResolver: CSSVariablesResolver = resolvedTheme => ({
    variables: {
        '--mantine-other-accent-color': resolvedTheme.other.accentColor,
        '--mantine-other-amber-accent': resolvedTheme.other.amberAccent,
        '--mantine-other-navy-bg': resolvedTheme.other.navyBg,
        '--mantine-other-surface-bg': resolvedTheme.other.surfaceBg,
        '--mantine-other-surface-inset': resolvedTheme.other.surfaceInset,
        '--mantine-other-text-primary': resolvedTheme.other.textPrimary,
        '--mantine-other-text-secondary': resolvedTheme.other.textSecondary
    },
    light: {},
    dark: {}
});
