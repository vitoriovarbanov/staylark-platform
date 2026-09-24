import { Link, useLocation } from 'react-router';
import { Button, Group } from '@mantine/core';
import { IconArrowLeft, IconMapPinSearch } from '@tabler/icons-react';
import { motion } from 'motion/react';
import { RooflineField } from '@/components/RooflineField/RooflineField';
import { useStaggerAnimation } from '@/hooks/useStaggerAnimation';
import classes from './NotFoundPage.module.css';

export function NotFoundPage() {
    const { pathname } = useLocation();

    return (
        <div className={classes.page}>
            <div className={classes.panel}>
                {/* The auth pages' village at night; the missing page is a street with no house on it */}
                <RooflineField tone='dusk' placement='bottom' contained />

                <div className={classes.content}>
                    <motion.p {...useStaggerAnimation(0, { delay: 0.1 })} className={classes.eyebrow}>
                        Error 404 · Page not found
                    </motion.p>

                    <motion.div {...useStaggerAnimation(1, { delay: 0.1, y: 16 })} className={classes.numerals}>
                        <span>4</span>
                        <span className={classes.zero} aria-hidden='true'>
                            0
                        </span>
                        <span>4</span>
                    </motion.div>

                    <motion.h1 {...useStaggerAnimation(2, { delay: 0.1 })} className={classes.title}>
                        There&rsquo;s no house at this address
                    </motion.h1>

                    <motion.p {...useStaggerAnimation(3, { delay: 0.1 })} className={classes.body}>
                        This page doesn&rsquo;t exist or may have moved. Let&rsquo;s get you back to somewhere you
                        can actually stay.
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
