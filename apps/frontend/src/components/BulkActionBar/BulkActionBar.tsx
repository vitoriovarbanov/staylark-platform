import { type ReactNode } from 'react';
import { Group, Button, Text } from '@mantine/core';
import { motion, AnimatePresence } from 'motion/react';
import { useReducedMotion } from '@mantine/hooks';
import classes from './BulkActionBar.module.css';

interface BulkActionBarProps {
    count: number;
    label?: ReactNode;
    onClear: () => void;
    children: ReactNode;
}

export function BulkActionBar({ count, label, onClear, children }: BulkActionBarProps) {
    const reduced = useReducedMotion();
    const defaultLabel = `${count} item${count === 1 ? '' : 's'} selected`;

    return (
        <AnimatePresence>
            {count > 0 && (
                <motion.div
                    className={classes.bar}
                    initial={reduced ? false : { y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={reduced ? { opacity: 0 } : { y: 20, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                    <Group justify='space-between' align='center'>
                        <Text className={classes.count}>{label ?? defaultLabel}</Text>
                        <Group gap='xs'>
                            {children}
                            <Button size='sm' variant='subtle' color='gray' onClick={onClear}>
                                Clear
                            </Button>
                        </Group>
                    </Group>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
