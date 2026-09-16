import dayjs from 'dayjs';
import { motion } from 'motion/react';
import type { AdminStatsTotals } from '@staylark/contract';
import { GeometricPattern } from '@/components/GeometricPattern/GeometricPattern';
import { formatEURCompact } from '@/lib/currency';
import { prefersReducedMotion, staggered } from '@/pages/Bookings/utils/bookings.utils';
import classes from './CommandDeck.module.css';

type Tone = 'volume' | 'money' | 'alert';

interface Metric {
    key: keyof AdminStatsTotals;
    label: string;
    value: string;
    tone: Tone;
    hint?: string;
    /** Real 0–100 ratio drives the gauge fill (occupancy). Omitted metrics get
     *  a short categorical accent tick instead. */
    gauge?: number;
}

interface Tier {
    id: string;
    label: string;
    scope: string;
    /** Live tier shows the pulsing dot — its metrics are point-in-time. */
    live?: boolean;
    metrics: Metric[];
}

// Split metrics by the timeframe they actually measure so the deck doesn't imply
// everything is "this month": cumulative portfolio totals vs. current-period state.
function buildTiers(t: AdminStatsTotals): Tier[] {
    const hasOpenTickets = t.openTickets > 0;
    return [
        {
            id: 'portfolio',
            label: 'Portfolio',
            scope: 'All-time',
            metrics: [
                { key: 'guestsHosted', label: 'Guests hosted', value: String(t.guestsHosted), tone: 'volume' },
                { key: 'properties', label: 'Properties', value: String(t.properties), tone: 'volume' },
                {
                    key: 'revenue',
                    label: 'Booking revenue',
                    value: formatEURCompact(t.revenue),
                    tone: 'money',
                    hint: 'Completed stays'
                }
            ]
        },
        {
            id: 'current',
            label: 'Current',
            scope: dayjs().format('MMM YYYY').toUpperCase(),
            live: true,
            metrics: [
                {
                    key: 'avgOccupancy',
                    label: 'Occupancy',
                    value: `${t.avgOccupancy}%`,
                    tone: 'money',
                    hint: 'This month',
                    gauge: t.avgOccupancy
                },
                {
                    key: 'activeBookings',
                    label: 'Active bookings',
                    value: String(t.activeBookings),
                    tone: 'volume',
                    hint: 'Confirmed + in-stay'
                },
                {
                    key: 'openTickets',
                    label: 'Open tickets',
                    value: String(t.openTickets),
                    tone: hasOpenTickets ? 'alert' : 'volume',
                    hint: hasOpenTickets ? 'Needs action' : 'All clear'
                }
            ]
        }
    ];
}

export function CommandDeck({ totals }: { totals: AdminStatsTotals }) {
    const reduced = prefersReducedMotion();
    const tiers = buildTiers(totals);

    // 'volume' has no modifier class — only money/alert tones are styled.
    const toneClass = (tone: Tone) => (tone === 'volume' ? '' : classes[tone]);

    // Continuous reveal index across both tiers.
    let cellIndex = 0;

    return (
        <motion.div
            className={classes.deck}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={staggered(0, reduced)}
        >
            <span className={classes.glow} aria-hidden='true' />
            <GeometricPattern variant='blueprint' opacity={0.05} color='#ffffff' />

            {tiers.map(tier => (
                <div key={tier.id} className={classes.tier}>
                    <div className={classes.tierHead}>
                        <span className={classes.eyebrow}>
                            {tier.live && <span className={classes.dot} aria-hidden='true' />}
                            {tier.label}
                            <span className={classes.eyebrowDivider}>/</span>
                            <span className={classes.eyebrowMonth}>{tier.scope}</span>
                        </span>
                    </div>

                    <div className={classes.metrics}>
                        {tier.metrics.map(m => {
                            const i = cellIndex++;
                            const isGauge = m.gauge !== undefined;
                            const fillWidth = isGauge ? `${m.gauge}%` : '24%';
                            return (
                                <motion.div
                                    key={m.key}
                                    className={classes.cell}
                                    initial={reduced ? false : { opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={staggered(0.12 + i * 0.05, reduced)}
                                >
                                    <span className={classes.cellLabel}>{m.label}</span>
                                    <span className={`${classes.value} ${toneClass(m.tone)}`}>{m.value}</span>
                                    <span className={classes.gaugeTrack}>
                                        <span
                                            className={`${classes.gaugeFill} ${toneClass(m.tone)}`}
                                            style={{ width: fillWidth }}
                                        />
                                    </span>
                                    {m.hint && (
                                        <span className={`${classes.hint} ${m.tone === 'alert' ? classes.alert : ''}`}>
                                            {m.hint}
                                        </span>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </motion.div>
    );
}
