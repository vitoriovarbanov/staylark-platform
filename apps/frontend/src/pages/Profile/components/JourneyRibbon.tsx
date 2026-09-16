import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@mantine/core';
import { useReducedMotion } from '@mantine/hooks';
import { IconHome, IconMapPin, IconRoute } from '@tabler/icons-react';
import { motion } from 'motion/react';
import dayjs from 'dayjs';
import type { JourneyStop } from '@staylark/contract';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { countryCount, groupJourneyByCountry } from './journey-grouping';
import classes from './JourneyRibbon.module.css';

interface JourneyRibbonProps {
    journey: JourneyStop[];
    homeCity: string | null;
}

export function JourneyRibbon({ journey, homeCity }: JourneyRibbonProps) {
    const navigate = useNavigate();
    const reduced = useReducedMotion();

    // Adaptive: a single-country trip reads as a chronological route; spread it
    // across countries and that route becomes misleading + long, so group by country.
    const multiCountry = useMemo(() => countryCount(journey) > 1, [journey]);
    const groups = useMemo(
        () => (multiCountry ? groupJourneyByCountry(journey, homeCity) : []),
        [multiCountry, journey, homeCity]
    );

    if (journey.length === 0) {
        return (
            <EmptyState
                icon={IconRoute}
                title='Your journey starts here'
                body="Book your first stay and we'll trace your route, city by city."
                action={
                    <Button color='amber' radius='xl' size='md' onClick={() => navigate('/')}>
                        Book your first stay
                    </Button>
                }
            />
        );
    }

    if (multiCountry) {
        return (
            <div className={classes.wrap}>
                <div className={classes.groups}>
                    {groups.map((group, gi) => (
                        <motion.div
                            key={group.country}
                            className={classes.country}
                            initial={reduced ? false : { opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-40px' }}
                            transition={
                                reduced ? { duration: 0 } : { duration: 0.4, delay: gi * 0.08, ease: 'easeOut' }
                            }
                        >
                            <div className={classes.countryHead}>
                                <span className={classes.countryFlag} aria-hidden='true'>
                                    {group.flag}
                                </span>
                                <span className={classes.countryName}>{group.country}</span>
                                <span className={classes.countryCount}>
                                    {group.cities.length} {group.cities.length === 1 ? 'city' : 'cities'} ·{' '}
                                    {group.nights} {group.nights === 1 ? 'night' : 'nights'}
                                </span>
                            </div>
                            <div className={classes.chips}>
                                {group.cities.map(c => (
                                    <span
                                        key={c.city}
                                        className={`${classes.chip} ${c.isHome ? classes.chipHome : ''}`}
                                    >
                                        {c.isHome ? (
                                            <IconHome size={12} stroke={2.2} className={classes.chipHomeIcon} />
                                        ) : (
                                            <span className={classes.chipDot} aria-hidden='true' />
                                        )}
                                        {c.city}
                                        <span className={classes.chipNights}>{c.nights}n</span>
                                    </span>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={classes.wrap}>
            <ol className={classes.track}>
                {journey.map((stop, i) => {
                    const isHome = !!homeCity && stop.city.toLowerCase() === homeCity.toLowerCase();
                    return (
                        <motion.li
                            key={stop.city}
                            className={classes.stop}
                            initial={reduced ? false : { opacity: 0, y: 12 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-40px' }}
                            transition={reduced ? { duration: 0 } : { duration: 0.4, delay: i * 0.08, ease: 'easeOut' }}
                        >
                            <span className={`${classes.node} ${isHome ? classes.nodeHome : ''}`}>
                                {isHome ? (
                                    <IconHome size={13} stroke={2.2} />
                                ) : (
                                    <IconMapPin size={13} stroke={2.2} className={classes.pinIcon} />
                                )}
                            </span>
                            <span className={classes.body}>
                                <span className={classes.city}>{stop.city}</span>
                                <span className={classes.nights}>
                                    {stop.nights} {stop.nights === 1 ? 'night' : 'nights'}
                                </span>
                                <span className={classes.month}>{dayjs(stop.lastStay).format('MMM YYYY')}</span>
                                {isHome && <span className={classes.homePill}>home base</span>}
                            </span>
                        </motion.li>
                    );
                })}
            </ol>
        </div>
    );
}
