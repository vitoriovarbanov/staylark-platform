import classes from './GeometricPattern.module.css';

type PatternVariant = 'dots' | 'grid' | 'blueprint';

interface GeometricPatternProps {
    variant?: PatternVariant;
    opacity?: number;
    className?: string;
    /** CSS color for the pattern strokes. Defaults to brand-9 for light surfaces;
     *  pass a light value (e.g. '#fff') to render on dark/navy backgrounds. */
    color?: string;
}

function DotsPattern() {
    return (
        <pattern id='dots-pattern' x='0' y='0' width='24' height='24' patternUnits='userSpaceOnUse'>
            <circle cx='2' cy='2' r='1' fill='currentColor' />
        </pattern>
    );
}

function GridPattern() {
    return (
        <pattern id='grid-pattern' x='0' y='0' width='40' height='40' patternUnits='userSpaceOnUse'>
            <path d='M 40 0 L 0 0 0 40' fill='none' stroke='currentColor' strokeWidth='0.5' />
        </pattern>
    );
}

function BlueprintPattern() {
    return (
        <pattern id='blueprint-pattern' x='0' y='0' width='80' height='80' patternUnits='userSpaceOnUse'>
            <rect x='4' y='4' width='28' height='20' fill='none' stroke='currentColor' strokeWidth='0.5' />
            <rect x='40' y='8' width='36' height='32' fill='none' stroke='currentColor' strokeWidth='0.5' />
            <rect x='8' y='32' width='24' height='40' fill='none' stroke='currentColor' strokeWidth='0.5' />
            <rect x='48' y='48' width='24' height='24' fill='none' stroke='currentColor' strokeWidth='0.5' />
        </pattern>
    );
}

const patterns: Record<PatternVariant, { Component: React.FC; id: string }> = {
    dots: { Component: DotsPattern, id: 'dots-pattern' },
    grid: { Component: GridPattern, id: 'grid-pattern' },
    blueprint: { Component: BlueprintPattern, id: 'blueprint-pattern' }
};

export function GeometricPattern({
    variant = 'dots',
    opacity = 0.04,
    className,
    color = 'var(--mantine-color-brand-9)'
}: GeometricPatternProps) {
    const { Component, id } = patterns[variant];

    return (
        <svg className={`${classes.pattern} ${className ?? ''}`} style={{ opacity, color }} aria-hidden='true'>
            <defs>
                <Component />
            </defs>
            <rect width='100%' height='100%' fill={`url(#${id})`} />
        </svg>
    );
}
