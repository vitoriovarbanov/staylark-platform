import { useRef, useState, useEffect } from 'react';

/**
 * Triggers a one-time reveal when an element scrolls into view.
 * Respects prefers-reduced-motion (reveals immediately).
 */
export function useScrollReveal(threshold = 0.3) {
    const prefersReduced =
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ref = useRef<HTMLDivElement>(null);
    const [revealed, setRevealed] = useState(prefersReduced);

    useEffect(() => {
        if (revealed) return;
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setRevealed(true);
                    observer.disconnect();
                }
            },
            { threshold }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold, revealed]);

    return { ref, revealed };
}
