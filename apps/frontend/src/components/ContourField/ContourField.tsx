import { useState, useEffect } from 'react';
import classes from './ContourField.module.css';

// Focal point — left of center so contours fill the empty side opposite the auth form
const FOCAL_X = 350;
const FOCAL_Y = 380;

// Each ring: base ellipse radii + per-point wobble offsets for organic irregularity
const rings = [
    { rx: 55, ry: 45, offsets: [3, -2, 5, -4, 2, -3, 4, -1], opacity: 0.22 },
    { rx: 100, ry: 85, offsets: [-5, 8, -3, 6, -7, 4, -2, 7], opacity: 0.2 },
    { rx: 155, ry: 130, offsets: [8, -6, 10, -8, 5, -9, 7, -4], opacity: 0.18 },
    { rx: 220, ry: 185, offsets: [-10, 12, -7, 14, -11, 8, -6, 13], opacity: 0.16 },
    { rx: 290, ry: 250, offsets: [15, -12, 10, -16, 13, -8, 11, -14], opacity: 0.14 },
    { rx: 370, ry: 320, offsets: [-14, 18, -10, 15, -17, 12, -8, 16], opacity: 0.12 },
    { rx: 460, ry: 400, offsets: [20, -15, 12, -18, 16, -10, 14, -20], opacity: 0.1 },
    { rx: 560, ry: 490, offsets: [-18, 22, -14, 20, -22, 15, -12, 18], opacity: 0.08 }
];

/**
 * Generates a closed smooth curve through wobbled ellipse points.
 * Uses Catmull-Rom → cubic bezier conversion for organic contour shapes.
 */
function contourPath(cx: number, cy: number, rx: number, ry: number, offsets: number[]): string {
    const n = offsets.length;
    const points: { x: number; y: number }[] = [];

    for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2;
        points.push({
            x: cx + Math.cos(angle) * (rx + offsets[i]),
            y: cy + Math.sin(angle) * (ry + offsets[i] * 0.7)
        });
    }

    // Catmull-Rom interpolation: each segment P1→P2 uses neighbors P0,P3 for tangents
    let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 0; i < n; i++) {
        const p0 = points[(i - 1 + n) % n];
        const p1 = points[i];
        const p2 = points[(i + 1) % n];
        const p3 = points[(i + 2) % n];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    return d + ' Z';
}

export function ContourField() {
    const prefersReduced =
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const [revealed, setRevealed] = useState(prefersReduced);

    useEffect(() => {
        if (revealed) return;
        // Trigger on next frame so the transition activates
        requestAnimationFrame(() => setRevealed(true));
    }, [revealed]);

    return (
        <div className={classes.container} aria-hidden='true'>
            <div className={classes.dotPattern} />
            <svg className={classes.svg} viewBox='0 0 1200 800' preserveAspectRatio='xMidYMid slice'>
                {rings.map((ring, i) => (
                    <path
                        key={i}
                        d={contourPath(FOCAL_X, FOCAL_Y, ring.rx, ring.ry, ring.offsets)}
                        fill='none'
                        stroke='var(--mantine-color-brand-4)'
                        strokeWidth='1.5'
                        className={classes.contourLine}
                        style={{
                            opacity: revealed ? ring.opacity : 0,
                            transitionDelay: `${i * 0.12}s`
                        }}
                    />
                ))}
            </svg>
        </div>
    );
}
