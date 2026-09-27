import { useEffect, useRef, useState } from 'react';
import classes from './HeroTowns.module.css';

const CITIES = [
    'Sofia',
    'Vienna',
    'Rome',
    'London',
    'Paris',
    'Lisbon',
    'Prague',
    'Amsterdam',
    'Athens',
    'Barcelona',
    'Budapest',
    'Copenhagen',
    'Berlin',
    'Florence',
    'Dubrovnik',
    'Edinburgh',
    'Madrid',
    'Kraków',
    'Stockholm',
    'Porto',
    'Munich',
    'Dublin',
    'Istanbul',
    'Oslo'
];

// Roof positions in the 620×250 viewBox — a loose hillside, two rows deep
const SLOTS = [
    { x: 80, y: 60 },
    { x: 215, y: 165 },
    { x: 370, y: 95 },
    { x: 530, y: 180 }
];

const SLOT_ORDER = [2, 0, 3, 1];
const TICK_MS = 2800;

interface SlotState {
    city: string;
    previous: string | null;
    version: number;
}

const isLit = (city: string) => CITIES.indexOf(city) % 4 !== 0;

export function HeroTowns() {
    const [slots, setSlots] = useState<SlotState[]>(() =>
        SLOTS.map((_, i) => ({ city: CITIES[i], previous: null, version: 0 }))
    );
    const shown = useRef(slots.map(s => s.city));
    const tick = useRef(0);
    const cursor = useRef(SLOTS.length);

    useEffect(() => {
        // Decorative motion: with reduced motion the first four simply stay put
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const id = window.setInterval(() => {
            if (document.hidden) return;
            const slot = SLOT_ORDER[tick.current % SLOT_ORDER.length];
            tick.current += 1;

            // Pick outside the state updater — StrictMode runs updaters twice
            let next = CITIES[cursor.current % CITIES.length];
            while (shown.current.includes(next)) {
                cursor.current += 1;
                next = CITIES[cursor.current % CITIES.length];
            }
            cursor.current += 1;
            shown.current[slot] = next;

            setSlots(current =>
                current.map((s, i) => (i === slot ? { city: next, previous: s.city, version: s.version + 1 } : s))
            );
        }, TICK_MS);

        return () => window.clearInterval(id);
    }, []);

    return (
        <svg className={classes.towns} viewBox='0 0 620 250' aria-hidden='true'>
            <defs>
                <filter id='home-hero-glow' x='-200%' y='-200%' width='500%' height='500%'>
                    <feGaussianBlur stdDeviation='4' result='blur' />
                    <feMerge>
                        <feMergeNode in='blur' />
                        <feMergeNode in='SourceGraphic' />
                    </feMerge>
                </filter>
            </defs>
            {SLOTS.map(({ x, y }, i) => {
                const { city, previous, version } = slots[i];
                return (
                    <g key={i}>
                        <path className={classes.roof} d={`M${x - 54} ${y} L${x} ${y - 30} L${x + 54} ${y}`} />
                        {isLit(city) ? (
                            <circle
                                key={`w${version}`}
                                className={`${classes.windowLit} ${version ? classes.relight : ''}`}
                                cx={x}
                                cy={y - 11}
                                r={7}
                                filter='url(#home-hero-glow)'
                            />
                        ) : (
                            <circle
                                key={`w${version}`}
                                className={`${classes.windowOpen} ${version ? classes.relight : ''}`}
                                cx={x}
                                cy={y - 11}
                                r={6.5}
                            />
                        )}
                        {previous && (
                            <text key={`out${version}`} className={`${classes.name} ${classes.exit}`} x={x} y={y + 34}>
                                {previous}
                            </text>
                        )}
                        <text
                            key={`in${version}`}
                            className={`${classes.name} ${version ? classes.enter : ''}`}
                            x={x}
                            y={y + 34}
                        >
                            {city}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}
