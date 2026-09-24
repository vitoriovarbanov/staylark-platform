import { useState, useEffect, useId } from 'react';
import classes from './RooflineField.module.css';

type Tone = 'day' | 'dusk';
type Placement = 'right' | 'bottom';

interface RooflineFieldProps {
    /** `day` — plum strokes on a light ground. `dusk` — the same village at night: pale strokes, glowing windows. */
    tone?: Tone;
    /** Where the village gathers: `right` leaves the left side clear for a form or copy; `bottom` leaves the top clear for centred content. */
    placement?: Placement;
    /** Fill the nearest positioned ancestor instead of the viewport (heroes, panels). */
    contained?: boolean;
    className?: string;
}

interface Roof {
    d: string;
    accent: boolean;
    strokeWidth: number;
    opacity: number;
    window?: { cx: number; cy: number; r: number; opacity: number; flicker: boolean };
}

const TONES = {
    day: {
        stroke: 'var(--mantine-color-brand-4)',
        accent: 'var(--mantine-color-brand-6)',
        window: 'var(--mantine-color-amber-5)',
        opBase: 0.2,
        opScale: 0.3,
        windowP: 0.07
    },
    dusk: {
        stroke: 'var(--mantine-color-brand-3)',
        accent: 'var(--mantine-color-brand-2)',
        window: 'var(--mantine-color-amber-4)',
        opBase: 0.16,
        opScale: 0.34,
        // Draws from the same random value as `day`, so night lights a superset of the day's windows
        windowP: 0.16
    }
} as const;

// Deterministic PRNG (mulberry32) so the village is identical on every render and load
function seededRandom(seed: number) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Weight the village away from the content; a faint trace remains behind it
const FADES: Record<Placement, (x: number, y: number) => number> = {
    right: x => 0.12 + 0.88 * Math.pow(clamp((x - 380) / 700, 0, 1), 1.1),
    bottom: (_x, y) => 0.06 + 0.94 * Math.pow(clamp((y - 300) / 440, 0, 1), 1.2)
};

// Keep lit windows out of the content zone
const WINDOW_ZONES: Record<Placement, Record<Tone, (x: number, y: number) => boolean>> = {
    right: { day: x => x > 560, dusk: x => x > 380 },
    bottom: { day: (_x, y) => y > 520, dusk: (_x, y) => y > 440 }
};

/**
 * Builds a hillside village of logo-roof chevrons in a 1200×800 space.
 * Rows run back (small, top) to front (large, bottom) and roll along a sine "hill".
 * A few amber windows stand for booked stays.
 */
function buildVillage(tone: Tone, placement: Placement): Roof[][] {
    const random = seededRandom(7);
    const { opBase, opScale, windowP } = TONES[tone];
    const fade = FADES[placement];
    const inWindowZone = WINDOW_ZONES[placement][tone];
    const rows: Roof[][] = [];

    for (let y = 90; y < 860; ) {
        const scale = 0.45 + (y / 800) * 0.95;
        const w = 44 * scale;
        const h = 22 * scale;
        const step = w * 1.55;
        const row: Roof[] = [];

        for (let x = -40 + random() * step; x < 1240; x += step) {
            if (random() < 0.22) continue;
            const cx = x + (random() - 0.5) * step * 0.3;
            const cy = y + Math.sin(cx * 0.006 + y * 0.013) * 38 * scale;
            const f = fade(cx, cy);
            const roof: Roof = {
                d: `M${(cx - w / 2).toFixed(1)} ${cy.toFixed(1)} L${cx.toFixed(1)} ${(cy - h).toFixed(1)} L${(cx + w / 2).toFixed(1)} ${cy.toFixed(1)}`,
                accent: random() < 0.12,
                strokeWidth: 2.4 * scale,
                opacity: Math.pow(f, 1.8) * (opBase + opScale * scale)
            };
            if (random() < windowP && inWindowZone(cx, cy)) {
                roof.window = {
                    cx,
                    cy: cy - h * 0.3,
                    r: 3 * scale,
                    opacity: (tone === 'dusk' ? 1 : 0.85) * f,
                    // Index-derived rather than random() so both tones share one layout
                    flicker: (rows.length * 7 + row.length * 13) % 10 < 3
                };
            }
            row.push(roof);
        }

        rows.push(row);
        y += 30 * scale + 8;
    }
    return rows;
}

const villages = new Map<string, Roof[][]>();
function getVillage(tone: Tone, placement: Placement) {
    const key = `${tone}:${placement}`;
    let village = villages.get(key);
    if (!village) {
        village = buildVillage(tone, placement);
        villages.set(key, village);
    }
    return village;
}

export function RooflineField({ tone = 'day', placement = 'right', contained = false, className }: RooflineFieldProps) {
    const prefersReduced =
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const [revealed, setRevealed] = useState(prefersReduced);
    // Several fields can share a page (hero + empty state), so the glow filter id must be unique
    const glowId = `roofline-glow-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;

    useEffect(() => {
        if (revealed) return;
        // Trigger on next frame so the transition activates
        requestAnimationFrame(() => setRevealed(true));
    }, [revealed]);

    const village = getVillage(tone, placement);
    const colors = TONES[tone];

    return (
        <div
            className={`${classes.container} ${contained ? classes.contained : ''} ${className ?? ''}`}
            aria-hidden='true'
        >
            <svg
                className={classes.svg}
                viewBox='0 0 1200 800'
                preserveAspectRatio={placement === 'bottom' ? 'xMidYMax slice' : 'xMidYMid slice'}
            >
                {tone === 'dusk' && (
                    <defs>
                        <filter id={glowId} x='-200%' y='-200%' width='500%' height='500%'>
                            <feGaussianBlur stdDeviation='3' result='blur' />
                            <feMerge>
                                <feMergeNode in='blur' />
                                <feMergeNode in='SourceGraphic' />
                            </feMerge>
                        </filter>
                    </defs>
                )}
                {village.map((row, i) => (
                    <g
                        key={i}
                        className={classes.row}
                        style={{ opacity: revealed ? 1 : 0, transitionDelay: `${i * 0.05}s` }}
                    >
                        {row.map((roof, j) => (
                            <g key={j}>
                                <path
                                    d={roof.d}
                                    fill='none'
                                    stroke={roof.accent ? colors.accent : colors.stroke}
                                    strokeWidth={roof.strokeWidth}
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                    opacity={roof.opacity}
                                />
                                {roof.window && (
                                    <circle
                                        className={tone === 'dusk' && roof.window.flicker ? classes.flicker : undefined}
                                        style={
                                            tone === 'dusk' && roof.window.flicker
                                                ? { animationDelay: `${((i * 3 + j) % 10) * 0.5}s` }
                                                : undefined
                                        }
                                        cx={roof.window.cx}
                                        cy={roof.window.cy}
                                        r={roof.window.r}
                                        fill={colors.window}
                                        opacity={roof.window.opacity}
                                        filter={tone === 'dusk' ? `url(#${glowId})` : undefined}
                                    />
                                )}
                            </g>
                        ))}
                    </g>
                ))}
            </svg>
        </div>
    );
}
