import { useEffect } from 'react';

const HEIGHT_VAR = '--app-vvh';
const OFFSET_TOP_VAR = '--app-vv-top';

/**
 * Mirrors the visual viewport into CSS custom properties while `enabled`.
 *
 * iOS Safari does not shrink the layout viewport when the software keyboard
 * opens — `vh` and `dvh` both keep reporting the full screen height. It then
 * scrolls the *visual* viewport to reveal the focused field, which drags
 * `position: fixed` elements (Mantine's modal inner is `fixed; top: 0;
 * bottom: 0`) partly off screen. `window.visualViewport` is the only thing
 * that reflects what the user can actually see.
 *
 * Sets:
 *   --app-vvh      height of the visible area
 *   --app-vv-top   how far the visual viewport has been scrolled down
 *
 * Both are removed on cleanup so the CSS fallbacks take over again.
 */
export function useVisualViewport(enabled: boolean): void {
    useEffect(() => {
        const viewport = window.visualViewport;
        if (!enabled || !viewport) return;

        const root = document.documentElement;
        const sync = () => {
            root.style.setProperty(HEIGHT_VAR, `${viewport.height}px`);
            root.style.setProperty(OFFSET_TOP_VAR, `${viewport.offsetTop}px`);
        };

        /**
         * Safari runs its own scroll-into-view when a field is focused, but that
         * happens BEFORE the resize below shrinks the modal — which invalidates
         * it and leaves the focused field cut off at the modal's bottom edge.
         * Re-run it once the new size has been laid out.
         */
        const revealFocusedField = () => {
            const active = document.activeElement;
            if (!(active instanceof HTMLTextAreaElement) && !(active instanceof HTMLInputElement)) return;
            active.scrollIntoView({ block: 'center', behavior: 'auto' });
        };

        const onResize = () => {
            sync();
            requestAnimationFrame(revealFocusedField);
        };

        sync();
        viewport.addEventListener('resize', onResize);
        // Scroll only mirrors the offset. Re-revealing here too would fight the
        // scroll it just performed.
        viewport.addEventListener('scroll', sync);

        return () => {
            viewport.removeEventListener('resize', onResize);
            viewport.removeEventListener('scroll', sync);
            root.style.removeProperty(HEIGHT_VAR);
            root.style.removeProperty(OFFSET_TOP_VAR);
        };
    }, [enabled]);
}
