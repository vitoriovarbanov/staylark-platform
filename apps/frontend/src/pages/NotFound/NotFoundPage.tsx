import { Link, useLocation } from 'react-router';
import { Button, Group } from '@mantine/core';
import { IconArrowLeft, IconMapPinSearch } from '@tabler/icons-react';
import { motion } from 'motion/react';
import { cities, routes, arcPath } from '@/components/DestinationRoutes/route-data';
import { useStaggerAnimation } from '@/hooks/useStaggerAnimation';
import classes from './NotFoundPage.module.css';

/**
 * NotFoundPage — branded 404 for unknown routes.
 *
 * Leans into the product's "Destination Routes" identity: the faint city/route
 * map (reused from the auth pages) sits behind a navy scanline panel, and the
 * 404 reads as a destination that simply isn't on the map. Rendered inside the
 * AppShell so the top nav stays available.
 */
export function NotFoundPage() {
    const { pathname } = useLocation();

    return (
        <div className={classes.page}>
            <div className={classes.panel}>
                {/* Atmospheric route map — the same canonical city graph as the auth pages */}
                <svg
                    className={classes.map}
                    viewBox='0 0 950 500'
                    preserveAspectRatio='xMidYMid slice'
                    aria-hidden='true'
                >
                    {routes.map(([fromIdx, toIdx], rIdx) => {
                        const from = cities[fromIdx];
                        const to = cities[toIdx];
                        return (
                            <path
                                key={`route-${rIdx}`}
                                d={arcPath(from.x, from.y, to.x, to.y)}
                                className={classes.routeArc}
                            />
                        );
                    })}
                    {cities.map(city => (
                        <circle key={city.name} cx={city.x} cy={city.y} r={2.5} className={classes.cityDot} />
                    ))}
                </svg>

                <div className={classes.content}>
                    <motion.p {...useStaggerAnimation(0, { delay: 0.1 })} className={classes.eyebrow}>
                        Error 404 · Route not found
                    </motion.p>

                    <motion.div {...useStaggerAnimation(1, { delay: 0.1, y: 16 })} className={classes.numerals}>
                        <span>4</span>
                        <span className={classes.zero} aria-hidden='true'>
                            0
                        </span>
                        <span>4</span>
                    </motion.div>

                    <motion.h1 {...useStaggerAnimation(2, { delay: 0.1 })} className={classes.title}>
                        You&rsquo;ve wandered off the map
                    </motion.h1>

                    <motion.p {...useStaggerAnimation(3, { delay: 0.1 })} className={classes.body}>
                        This destination doesn&rsquo;t exist or may have moved. Let&rsquo;s route you back to somewhere
                        you can actually stay.
                    </motion.p>

                    <motion.p {...useStaggerAnimation(4, { delay: 0.1 })} className={classes.path}>
                        <span className={classes.pathLabel}>requested</span>
                        <span className={classes.pathValue}>{pathname}</span>
                    </motion.p>

                    <motion.div {...useStaggerAnimation(5, { delay: 0.1 })}>
                        <Group justify='center' gap='sm' mt='xl'>
                            <Button component={Link} to='/' leftSection={<IconArrowLeft size={18} stroke={1.8} />}>
                                Back to home
                            </Button>
                            <Button
                                component={Link}
                                to='/properties'
                                variant='default'
                                leftSection={<IconMapPinSearch size={18} stroke={1.8} />}
                            >
                                Browse properties
                            </Button>
                        </Group>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
