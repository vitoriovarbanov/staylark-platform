import { useReducedMotion } from '@mantine/hooks';
import { motion } from 'motion/react';
import type { CountryStat } from '@staylark/contract';
import classes from './PassportStamps.module.css';

interface PassportStampsProps {
    perCountry: CountryStat[];
}

// Deterministic, gently-varied rotation so each stamp reads hand-pressed
// without re-randomising on every render.
const TILTS = [-2.5, 1.5, -1, 2.5, -2, 1] as const;

export function PassportStamps({ perCountry }: PassportStampsProps) {
    const reduceMotion = useReducedMotion();

    if (perCountry.length === 0) return null;

    return (
        <div
            className={`${classes.row} ${perCountry.length === 1 ? classes.rowSingle : ''}`}
            role='list'
            aria-label='Countries you have stayed in'
        >
            {perCountry.map((c, i) => (
                <motion.div
                    key={c.country}
                    role='listitem'
                    className={classes.stamp}
                    style={{ '--tilt': `${TILTS[i % TILTS.length]}deg` } as React.CSSProperties}
                    initial={reduceMotion ? false : { opacity: 0, y: 10, rotate: 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.4, delay: i * 0.06, ease: 'easeOut' }}
                >
                    <span className={classes.perforation} aria-hidden='true' />
                    <span className={classes.flag}>{c.flag}</span>
                    <span className={classes.country}>{c.country}</span>
                    <span className={classes.meta}>
                        {c.cities} {c.cities === 1 ? 'city' : 'cities'} · {c.nights}{' '}
                        {c.nights === 1 ? 'night' : 'nights'}
                    </span>
                </motion.div>
            ))}
        </div>
    );
}
