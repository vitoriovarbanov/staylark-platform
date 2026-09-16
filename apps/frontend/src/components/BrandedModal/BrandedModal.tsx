import { Modal } from '@mantine/core';
import { useMediaQuery, useReducedMotion } from '@mantine/hooks';
import { IconX } from '@tabler/icons-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { useVisualViewport } from '@/hooks/use-visual-viewport';
import classes from './BrandedModal.module.css';

export type BrandedModalTone = 'neutral' | 'urgent';

interface BrandedModalProps {
    opened: boolean;
    onClose: () => void;
    eyebrow: ReactNode;
    title: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'lg' | 'xl';
    tone?: BrandedModalTone;
    closeOnEscape?: boolean;
    closeOnClickOutside?: boolean;
    ariaLabel?: string;
}

export function BrandedModal({
    opened,
    onClose,
    eyebrow,
    title,
    children,
    footer,
    size = 'lg',
    tone = 'neutral',
    closeOnEscape = true,
    closeOnClickOutside = true,
    ariaLabel
}: BrandedModalProps) {
    const reduced = useReducedMotion();
    const isMobile = useMediaQuery('(max-width: 600px)');

    // Only while a modal is actually up on a phone — this is the one place the
    // keyboard can push a fixed overlay out of view.
    useVisualViewport(opened && isMobile === true);

    const initial = reduced ? false : { opacity: 0, y: 12 };
    const animate = reduced ? undefined : { opacity: 1, y: 0 };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            withCloseButton={false}
            centered
            size={isMobile ? '100%' : size}
            padding={0}
            radius='lg'
            closeOnEscape={closeOnEscape}
            closeOnClickOutside={closeOnClickOutside}
            aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)}
            classNames={{
                content: classes.content,
                body: classes.bodyReset,
                inner: classes.inner
            }}
        >
            <motion.div
                className={classes.header}
                data-tone={tone}
                initial={initial}
                animate={animate}
                transition={{ duration: 0.25, delay: 0.05 }}
            >
                <div className={classes.headerInner}>
                    <div className={classes.headerText}>
                        <span className={classes.eyebrow} data-tone={tone}>
                            {eyebrow}
                        </span>
                        <h2 className={classes.title}>{title}</h2>
                    </div>
                    <button type='button' className={classes.closeButton} onClick={onClose} aria-label='Close dialog'>
                        <IconX size={16} stroke={2} />
                    </button>
                </div>
            </motion.div>

            <motion.div
                className={classes.body}
                initial={initial}
                animate={animate}
                transition={{ duration: 0.25, delay: 0.15 }}
            >
                {children}
            </motion.div>

            {footer && (
                <motion.div
                    className={classes.footer}
                    initial={initial}
                    animate={animate}
                    transition={{ duration: 0.25, delay: 0.25 }}
                >
                    {footer}
                </motion.div>
            )}
        </Modal>
    );
}
