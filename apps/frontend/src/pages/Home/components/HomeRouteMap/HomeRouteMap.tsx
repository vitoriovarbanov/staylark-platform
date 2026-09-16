import { useState, useRef, useEffect } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import { cities, routes, arcPath } from '@/components/DestinationRoutes/route-data';
import classes from './HomeRouteMap.module.css';

interface HomeRouteMapProps {
    onCityClick: (cityName: string) => void;
}

export function HomeRouteMap({ onCityClick }: HomeRouteMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoveredCity, setHoveredCity] = useState<string | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

    const prefersReduced =
        typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const [interactive, setInteractive] = useState(prefersReduced);

    const isMobile = useMediaQuery('(max-width: 48em)');
    const isLargeScreen = useMediaQuery('(min-width: 90em)');

    // Mobile pads the viewBox and uses `meet` (not `slice`) so edge-of-map city
    // labels (Madrid, Bucharest) aren't cropped at the viewport edges.
    const viewBox = isMobile ? '170 40 610 420' : isLargeScreen ? '-100 -150 1150 850' : '0 -50 950 600';
    const preserveAspectRatio = isMobile ? 'xMidYMid meet' : 'xMidYMid slice';

    useEffect(() => {
        if (interactive) return;
        const timer = setTimeout(() => setInteractive(true), 2500);
        return () => clearTimeout(timer);
    }, [interactive]);

    const handleCityEnter = (cityName: string, e: React.MouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setHoveredCity(cityName);
        setTooltipPos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    const hoveredCityData = hoveredCity ? cities.find(c => c.name === hoveredCity) : null;
    const tooltipAbove = hoveredCityData ? hoveredCityData.y > 30 : true;

    return (
        <div ref={containerRef} className={classes.mapContainer} data-interactive={interactive || undefined}>
            <svg className={classes.svg} viewBox={viewBox} preserveAspectRatio={preserveAspectRatio}>
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
                            strokeWidth='1.2'
                            className={classes.routeArc}
                            style={{
                                animationDelay: `${rIdx * 0.08 + 0.1}s`,
                                ...(interactive && { opacity: 0.25 })
                            }}
                        />
                    );
                })}

                {/* Animated travel dots along select routes */}
                {routes.map(([fromIdx, toIdx], rIdx) => {
                    if (rIdx % 3 !== 0) return null;
                    const from = cities[fromIdx];
                    const to = cities[toIdx];
                    const d = arcPath(from.x, from.y, to.x, to.y);
                    return (
                        <circle key={`dot-${rIdx}`} r='2' fill='var(--mantine-color-brand-4)' opacity={0.3}>
                            <animateMotion dur={`${6 + rIdx * 0.7}s`} repeatCount='indefinite' path={d} />
                        </circle>
                    );
                })}

                {/* City pins and labels */}
                {cities.map((city, cIdx) => {
                    const isHovered = hoveredCity === city.name;
                    const baseR = city.emphasis ? 5.5 : city.featured ? 4 : 2.5;
                    const pinColor =
                        city.featured || isHovered ? 'var(--mantine-color-amber-5)' : 'var(--mantine-color-brand-4)';
                    const pinOpacity = isHovered ? 1 : 0.9;
                    // Labels stay near-full opacity for legibility (they're clickable
                    // city names); hierarchy comes from size + colour, not transparency.
                    const labelOpacity = isHovered ? 1 : city.emphasis || city.featured ? 1 : 0.95;

                    return (
                        <g
                            key={city.name}
                            className={classes.cityGroup}
                            onMouseEnter={e => handleCityEnter(city.name, e)}
                            onMouseLeave={() => setHoveredCity(null)}
                            onClick={() => onCityClick(city.name)}
                        >
                            {/* Invisible hit target for easier hovering */}
                            <circle cx={city.x} cy={city.y} r={18} fill='transparent' className={classes.hitTarget} />

                            {/* Hover glow ring */}
                            {isHovered && (
                                <circle
                                    cx={city.x}
                                    cy={city.y}
                                    r={14}
                                    fill='none'
                                    stroke='var(--mantine-color-amber-4)'
                                    strokeWidth='1.5'
                                    className={classes.hoverRing}
                                />
                            )}

                            {/* Emphasis ring (Sofia) */}
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
                                r={isHovered ? baseR + 2.5 : baseR}
                                fill={pinColor}
                                className={classes.pinDot}
                                style={{
                                    animationDelay: `${cIdx * 0.15 + 1}s`,
                                    ...(interactive && { opacity: pinOpacity })
                                }}
                            />

                            {/* City label */}
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
                                style={{
                                    animationDelay: `${cIdx * 0.15 + 1.8}s`,
                                    ...(interactive && { opacity: labelOpacity })
                                }}
                            >
                                {city.name}
                            </text>
                        </g>
                    );
                })}
            </svg>

            {/* HTML tooltip overlay */}
            {hoveredCity && (
                <div
                    className={classes.tooltip}
                    style={{
                        left: tooltipPos.x,
                        top: tooltipPos.y,
                        transform: tooltipAbove ? 'translate(-50%, -100%) translateY(-12px)' : 'translate(-50%, 12px)'
                    }}
                >
                    <div className={classes.tooltipHeader}>
                        <div className={classes.tooltipDot} />
                        <span className={classes.tooltipCity}>{hoveredCity}</span>
                    </div>
                    <span className={classes.tooltipAction}>Explore properties &#8594;</span>
                </div>
            )}
        </div>
    );
}
