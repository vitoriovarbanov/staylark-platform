import { useMemo } from 'react';
import type { Easing } from 'motion/react';

interface StaggerAnimationProps {
    initial: { opacity: number; y: number };
    animate: { opacity: number; y: number };
    transition: { duration: number; ease: Easing; delay: number };
}

/**
 * Returns motion animation props for staggered reveal based on element index.
 * Spread onto a `motion.div` — no wrapper component needed.
 *
 * @param index - Position in the stagger sequence (0, 1, 2...)
 * @param options.delay - Base delay before stagger starts (default 0)
 * @param options.stagger - Delay between each item (default 0.06s)
 * @param options.duration - Animation duration per item (default 0.3s)
 * @param options.y - Initial vertical offset in px (default 12)
 *
 * @example
 * const animation = useStaggerAnimation(index);
 * <motion.div {...animation}><Card /></motion.div>
 */
export function useStaggerAnimation(
    index: number,
    options?: {
        delay?: number;
        stagger?: number;
        duration?: number;
        y?: number;
    }
): StaggerAnimationProps {
    const { delay = 0, stagger = 0.06, duration = 0.3, y = 12 } = options ?? {};

    return useMemo(
        () => ({
            initial: { opacity: 0, y },
            animate: { opacity: 1, y: 0 },
            transition: {
                duration,
                ease: 'easeOut' as Easing,
                delay: delay + index * stagger
            }
        }),
        [index, delay, stagger, duration, y]
    );
}
