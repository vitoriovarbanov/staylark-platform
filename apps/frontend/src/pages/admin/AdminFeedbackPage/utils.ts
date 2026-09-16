import type { FeedbackSentiment } from '@staylark/contract';

/** Mantine theme color name for a sentiment `Badge` */
export function sentimentBadgeColor(s: FeedbackSentiment | null): string {
    if (s === 'POSITIVE') return 'green';
    if (s === 'NEGATIVE') return 'red';
    return 'gray';
}

/** Mantine theme color token for a sentiment (used in chart data items) */
export function sentimentMantineColor(s: FeedbackSentiment): string {
    if (s === 'POSITIVE') return 'green.6';
    if (s === 'NEGATIVE') return 'red.6';
    return 'gray.5';
}

/** RingProgress color based on score thresholds (0-5 scale) */
export function scoreRingColor(score: number): string {
    if (score >= 4) return 'green.6';
    if (score >= 3) return 'yellow.6';
    return 'red.6';
}

export function formatTopic(s: string): string {
    return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function truncateWithEllipsis(s: string, max: number): string {
    return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** Format a percentage from a 0–1 fraction, e.g. 0.42 → "42%". */
export function formatPercent(fraction: number): string {
    return `${Math.round(fraction * 100)}%`;
}

/**
 * Build a period-over-period delta chip from a single `current - previous` difference.
 * Text and colour are derived from the SAME rounded value, so a change that rounds to zero
 * always renders "—" in neutral grey (never a grey-or-coloured mismatch).
 * `upIsGood` decides whether an increase is green (e.g. score) or red (e.g. negative rate).
 */
export function buildDelta(
    diff: number,
    opts: { upIsGood: boolean; decimals?: number; percent?: boolean }
): { text: string; color: string } {
    const decimals = opts.decimals ?? 0;
    const scaled = opts.percent ? diff * 100 : diff;
    const rounded = Number(scaled.toFixed(decimals));
    if (rounded === 0) return { text: '—', color: 'dimmed' };
    const arrow = rounded > 0 ? '▲' : '▼';
    const suffix = opts.percent ? 'pp' : '';
    const color = rounded > 0 === opts.upIsGood ? 'green.6' : 'red.6';
    return { text: `${arrow} ${Math.abs(rounded)}${suffix}`, color };
}

/** Human label for avg days-to-feedback, e.g. 2.4 → "2.4 days". Null → "—". */
export function daysToFeedbackLabel(days: number | null): string {
    if (days === null) return '—';
    return `${days.toFixed(1)} days`;
}
