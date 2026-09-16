import { cities, routes, arcPath } from './route-data';
import classes from './DestinationRoutes.module.css';

export function DestinationRoutes() {
    return (
        <div className={classes.container} aria-hidden='true'>
            <svg
                className={classes.svg}
                viewBox='0 0 950 500'
                preserveAspectRatio='xMidYMid slice'
                xmlns='http://www.w3.org/2000/svg'
            >
                {/* Route arcs */}
                {routes.map(([fromIdx, toIdx], rIdx) => {
                    const from = cities[fromIdx];
                    const to = cities[toIdx];
                    const d = arcPath(from.x, from.y, to.x, to.y);
                    return (
                        <path
                            key={`route-${rIdx}`}
                            d={d}
                            fill='none'
                            stroke='var(--mantine-color-brand-4)'
                            strokeWidth='1'
                            opacity='0.18'
                            className={classes.routeArc}
                            style={{ animationDelay: `${rIdx * 0.08 + 0.1}s` }}
                        />
                    );
                })}

                {/* Animated travel dots along select routes */}
                {routes.map(([fromIdx, toIdx], rIdx) => {
                    const from = cities[fromIdx];
                    const to = cities[toIdx];
                    const d = arcPath(from.x, from.y, to.x, to.y);
                    if (rIdx % 3 !== 0) return null;
                    return (
                        <circle key={`dot-${rIdx}`} r='2' fill='var(--mantine-color-brand-4)' opacity='0.3'>
                            <animateMotion dur={`${6 + rIdx * 0.7}s`} repeatCount='indefinite' path={d} />
                        </circle>
                    );
                })}

                {/* City pins and labels */}
                {cities.map((city, cIdx) => (
                    <g key={city.name} className={classes.cityGroup}>
                        {/* Emphasis glow ring for Sofia */}
                        {city.emphasis && (
                            <circle
                                cx={city.x}
                                cy={city.y}
                                r='22'
                                fill='none'
                                stroke='var(--mantine-color-amber-4)'
                                strokeWidth='0.8'
                                className={classes.emphasisRing}
                                style={{ animationDelay: `${cIdx * 0.1 + 1.0}s` }}
                            />
                        )}

                        {/* Pulse ring for featured cities */}
                        {city.featured && (
                            <circle
                                cx={city.x}
                                cy={city.y}
                                r='8'
                                fill='none'
                                stroke='var(--mantine-color-amber-5)'
                                strokeWidth='1'
                                className={classes.pinPulse}
                                style={{ animationDelay: `${cIdx * 0.4 + 2}s` }}
                            />
                        )}

                        {/* Pin dot */}
                        <circle
                            cx={city.x}
                            cy={city.y}
                            r={city.emphasis ? 5.5 : city.featured ? 4 : 2.5}
                            fill={city.featured ? 'var(--mantine-color-amber-5)' : 'var(--mantine-color-brand-4)'}
                            className={classes.pinDot}
                            style={{ animationDelay: `${cIdx * 0.15 + 1}s` }}
                        />

                        {/* City name label */}
                        <text
                            x={city.x}
                            y={city.y - (city.emphasis ? 15 : city.featured ? 12 : 9)}
                            className={
                                city.emphasis
                                    ? classes.cityLabelEmphasis
                                    : city.featured
                                      ? classes.cityLabelFeatured
                                      : classes.cityLabel
                            }
                            style={{ animationDelay: `${cIdx * 0.15 + 1.8}s` }}
                        >
                            {city.name}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
}
