import { Link } from 'react-router';
import { Button } from '@mantine/core';
import { IconArrowRight, IconPlaneDeparture } from '@tabler/icons-react';
import { GeometricPattern } from '@/components/GeometricPattern/GeometricPattern';
import classes from './MoreJourneysPromo.module.css';

export function MoreJourneysPromo() {
    return (
        <section className={classes.wrap} aria-labelledby='travel-log-heading'>
            <div className={classes.header}>
                <span className={classes.tick} aria-hidden='true' />
                <h3 id='travel-log-heading' className={classes.title}>
                    Your travel log
                </h3>
                <span className={classes.perforation} aria-hidden='true' />
            </div>

            <div className={classes.panel}>
                <GeometricPattern variant='blueprint' color='#C86FA5' opacity={0.07} className={classes.pattern} />

                <div className={classes.content}>
                    <div className={classes.copy}>
                        <span className={classes.eyebrow}>More to come</span>
                        <h4 className={classes.headline}>
                            One journey in.
                            <br />
                            Many more to go.
                        </h4>
                        <p className={classes.body}>
                            Every stay you book lands right here — an evolving log of where you&apos;ve been and where
                            you&apos;re headed next.
                        </p>
                        <Button
                            component={Link}
                            to='/properties'
                            variant='filled'
                            color='amber'
                            rightSection={<IconArrowRight size={16} />}
                            className={classes.cta}
                        >
                            Find your next stay
                        </Button>
                    </div>

                    <div className={classes.rack} aria-hidden='true'>
                        {[0, 1, 2].map(i => (
                            <div key={i} className={classes.ghost} style={{ '--i': i } as React.CSSProperties}>
                                <div className={classes.ghostStub}>
                                    <IconPlaneDeparture size={18} stroke={1.5} />
                                </div>
                                <div className={classes.ghostBody}>
                                    <span className={classes.ghostRoute}>
                                        <span className={classes.node} />
                                        <span className={classes.leg} />
                                        <span className={classes.node} />
                                    </span>
                                    <span className={classes.ghostLabel}>Awaiting booking</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
