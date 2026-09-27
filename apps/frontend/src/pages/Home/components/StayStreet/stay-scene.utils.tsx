import type { ReactNode } from 'react';
import type { Property } from '@staylark/contract';
import type { StaySetting } from './stay-setting';

export const W = 300;
export const H = 440;
const HORIZON = 232;
const GROUND = 256;

export const NIGHT = '#2a0f21';
export const DEEP = '#4a1b3a';
const FAR = '#5a2448';
const RIDGE = '#3b1530';
const PALE = '#f3e8f0';
const AMBER = '#e8a838';
const UNLIT = '#3a1a32';
export const GLOW = '#c86fa5';

function seededRandom(key: string) {
    let seed = 0;
    for (let i = 0; i < key.length; i++) seed = (Math.imul(31, seed) + key.charCodeAt(i)) | 0;
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

type Rand = () => number;
const between = (rand: Rand, min: number, max: number) => min + rand() * (max - min);

/** Where the stay stands: -1 left of centre, 1 right. The backdrop leans the other way. */
type Side = -1 | 1;

function cityBackdrop(rand: Rand): ReactNode {
    const blocks: ReactNode[] = [];
    let x = -10;
    let i = 0;
    while (x < W) {
        const w = between(rand, 24, 46);
        const h = between(rand, 50, 140);
        const top = GROUND - h;
        blocks.push(<rect key={`b${i}`} x={x} y={top} width={w} height={h} fill={FAR} />);
        // A spire or a dome now and then, so skylines differ
        const crown = rand();
        if (crown < 0.16) {
            blocks.push(
                <path
                    key={`c${i}`}
                    d={`M${x + w / 2 - 4} ${top} L${x + w / 2} ${top - 26} L${x + w / 2 + 4} ${top}Z`}
                    fill={FAR}
                />
            );
        } else if (crown < 0.3) {
            blocks.push(
                <path
                    key={`c${i}`}
                    d={`M${x + 3} ${top} A${w / 2 - 3} ${w / 2 - 3} 0 0 1 ${x + w - 3} ${top}Z`}
                    fill={FAR}
                />
            );
        }
        for (let wy = top + 10; wy < GROUND - 12; wy += 15) {
            if (rand() < 0.24) {
                blocks.push(
                    <rect
                        key={`w${i}-${wy}`}
                        x={x + between(rand, 5, w - 10)}
                        y={wy}
                        width={4}
                        height={6}
                        fill={AMBER}
                        opacity={0.75}
                    />
                );
            }
        }
        x += w + between(rand, -4, 6);
        i++;
    }
    return <g>{blocks}</g>;
}

function coastBackdrop(rand: Rand, side: Side): ReactNode {
    // Sun sets on the open side of the picture, away from the stay
    const sunX = W / 2 - side * between(rand, 62, 88);
    const capeX = W / 2 + side * 150;
    return (
        <g>
            <circle cx={sunX} cy={HORIZON} r={46} fill={AMBER} />
            <path
                d={`M${capeX - 90} ${HORIZON} Q${capeX - 40} ${HORIZON - 48} ${capeX} ${HORIZON - 40} L${capeX + 90} ${HORIZON}Z`}
                fill={RIDGE}
            />
            <rect x={0} y={HORIZON} width={W} height={H - HORIZON} fill={FAR} />
            <g stroke={GLOW} strokeWidth={2.5} strokeLinecap='round'>
                <path d={`M${sunX - 40} ${HORIZON + 7} H${sunX + 40}`} />
                <path d={`M${sunX - 26} ${HORIZON + 14} H${sunX + 26}`} opacity={0.8} />
                <path d={`M${sunX - 12} ${HORIZON + 20} H${sunX + 12}`} opacity={0.6} />
            </g>
        </g>
    );
}

const snowCap = (x: number, y: number, s: number) =>
    `M${x - 18 * s} ${y + 22 * s} L${x} ${y} L${x + 18 * s} ${y + 22 * s} L${x + 7 * s} ${y + 15 * s} L${x} ${y + 24 * s} L${x - 7 * s} ${y + 15 * s}Z`;

function mountainBackdrop(rand: Rand, side: Side): ReactNode {
    const ridge = (base: number, lift: number, count: number) => {
        const pts: [number, number][] = [[-20, base]];
        for (let i = 0; i <= count; i++) {
            const x = (i / count) * (W + 40) - 20;
            pts.push([x + between(rand, -10, 10), base - between(rand, lift * 0.6, lift)]);
            if (i < count) pts.push([x + (W + 40) / count / 2, base - between(rand, lift * 0.15, lift * 0.4)]);
        }
        pts.push([W + 20, base]);
        return pts;
    };
    const back = ridge(GROUND, 110, 3);
    const front = ridge(GROUND, 60, 3);
    const toPath = (pts: [number, number][]) => `M${pts.map(p => p.join(' ')).join(' L')} V${H} H-20Z`;
    // One big, lopsided peak on the open side of the picture, away from the stay
    const px = W / 2 - side * between(rand, 60, 80);
    const py = between(rand, 70, 90);
    const lean = side * between(rand, 8, 18);
    const peak = `M${px - 130} ${GROUND} L${px - 34 + lean} ${py + 70} L${px - 10} ${py + 20} L${px} ${py} L${px + 24} ${py + 58} L${px + 130} ${GROUND}Z`;
    // Snow on the back ridge's summits that sit inside the picture
    const summits = back.filter(([x], i) => i % 2 === 1 && x > 24 && x < W - 24);
    return (
        <g>
            <path d={toPath(back)} fill={RIDGE} opacity={0.7} />
            {summits.map(([x, y]) => (
                <path key={x} d={snowCap(x, y, 0.9)} fill={PALE} opacity={0.8} />
            ))}
            <path d={peak} fill={FAR} />
            <path d={snowCap(px, py, 1.7)} fill={PALE} />
            <path d={toPath(front)} fill={RIDGE} />
        </g>
    );
}

function countrysideBackdrop(rand: Rand): ReactNode {
    const backY = between(rand, 160, 185);
    const roofs = Array.from({ length: 4 }, (_, i) => ({
        x: 36 + i * 76 + between(rand, -16, 16),
        y: between(rand, 196, 214),
        lit: rand() < 0.65
    }));
    const trees = Array.from({ length: 3 }, () => ({ x: between(rand, 10, W - 10), y: between(rand, 228, 244) }));
    return (
        <g>
            <path
                d={`M-10 ${GROUND - 40} Q${W * 0.28} ${backY} ${W * 0.6} ${GROUND - 70} T${W + 10} ${backY + 20} V${H} H-10Z`}
                fill={FAR}
            />
            {roofs.map(r => (
                <g key={r.x}>
                    <path
                        d={`M${r.x - 9} ${r.y} L${r.x} ${r.y - 6} L${r.x + 9} ${r.y}`}
                        fill='none'
                        stroke={PALE}
                        strokeWidth={2}
                        opacity={0.5}
                        strokeLinecap='round'
                        strokeLinejoin='round'
                    />
                    {r.lit && <circle cx={r.x} cy={r.y - 1.5} r={1.6} fill={AMBER} opacity={0.8} />}
                </g>
            ))}
            <path
                d={`M-10 ${GROUND - 14} Q${W * 0.5} ${GROUND - 58} ${W + 10} ${GROUND - 22} V${H} H-10Z`}
                fill={RIDGE}
            />
            {trees.map(t => (
                <g key={t.x} fill={NIGHT}>
                    <rect x={t.x - 1.5} y={t.y} width={3} height={12} />
                    <circle cx={t.x} cy={t.y - 4} r={9} />
                </g>
            ))}
        </g>
    );
}

const BACKDROPS: Record<StaySetting, (rand: Rand, side: Side) => ReactNode> = {
    city: cityBackdrop,
    coast: coastBackdrop,
    mountain: mountainBackdrop,
    countryside: countrysideBackdrop
};

const BASE = 284;

const lit = (rand: Rand) => (rand() < 0.62 ? AMBER : UNLIT);

function windowGrid(rand: Rand, x: number, y: number, cols: number, rows: number, w: number, h: number, gap: number) {
    const cells: ReactNode[] = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            cells.push(
                <rect
                    key={`${r}-${c}`}
                    x={x + c * (w + gap)}
                    y={y + r * (h + gap)}
                    width={w}
                    height={h}
                    rx={1.5}
                    fill={lit(rand)}
                />
            );
        }
    }
    return cells;
}

const roofStroke = {
    fill: 'none',
    stroke: PALE,
    strokeWidth: 5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
} as const;

/** A balcony rail: a pale bar with short balusters hanging under it */
function balcony(x1: number, x2: number, y: number) {
    const posts: ReactNode[] = [];
    for (let x = x1 + 5; x < x2; x += 9) {
        posts.push(<path key={x} d={`M${x} ${y} V${y + 9}`} />);
    }
    return (
        <g stroke={PALE} strokeLinecap='round'>
            <path d={`M${x1} ${y} H${x2}`} strokeWidth={3} />
            <g strokeWidth={1.5} opacity={0.6}>
                {posts}
            </g>
        </g>
    );
}

function cityBuilding(type: Property['type'], rand: Rand): ReactNode {
    if (type === 'HOTEL') {
        return (
            <g>
                <path d={`M92 ${BASE} V128 L150 100 L208 128 V${BASE}Z`} fill={DEEP} />
                <path d='M84 132 L150 96 L216 132' {...roofStroke} />
                <rect x={112} y={140} width={76} height={4} rx={2} fill={AMBER} />
                {windowGrid(rand, 104, 156, 5, 6, 12, 12, 6)}
                <rect x={136} y={BASE - 22} width={28} height={22} fill={NIGHT} />
            </g>
        );
    }
    if (type === 'HOUSE') return gabledHouse(rand);
    return (
        <g>
            <path d={`M106 ${BASE} V150 L150 132 L194 150 V${BASE}Z`} fill={DEEP} />
            <path d='M98 154 L150 128 L202 154' {...roofStroke} />
            {windowGrid(rand, 118, 166, 3, 5, 14, 16, 10)}
        </g>
    );
}

function gabledHouse(rand: Rand): ReactNode {
    return (
        <g>
            <path d={`M96 ${BASE} V206 L150 164 L204 206 V${BASE}Z`} fill={DEEP} />
            <path d='M86 212 L150 158 L214 212' {...roofStroke} />
            <circle cx={150} cy={196} r={6} fill={AMBER} />
            {windowGrid(rand, 114, 218, 2, 1, 22, 22, 28)}
            <rect x={138} y={BASE - 36} width={24} height={36} fill={NIGHT} />
        </g>
    );
}

/** Wide chalet with deep eaves and a balcony per floor; a hotel gets a floor more */
function chalet(type: Property['type'], rand: Rand): ReactNode {
    const floors = type === 'HOTEL' ? 3 : 2;
    const half = type === 'HOTEL' ? 70 : 56;
    const top = BASE - floors * 30;
    const apex = top - half * 0.62;
    const floorsY = Array.from({ length: floors }, (_, f) => top + f * 30);
    // Windows spread evenly across the front, 12px in from each corner
    const cols = type === 'HOTEL' ? 5 : 4;
    const gap = (half * 2 - 24) / (cols - 1) - 12;
    return (
        <g>
            <rect x={150 - half} y={top} width={half * 2} height={BASE - top} fill={DEEP} />
            <path d={`M${150 - half - 18} ${top + 6} L150 ${apex} L${150 + half + 18} ${top + 6}Z`} fill={DEEP} />
            <path d={`M${150 - half - 18} ${top + 6} L150 ${apex} L${150 + half + 18} ${top + 6}`} {...roofStroke} />
            <circle cx={150} cy={top - 12} r={5.5} fill={AMBER} />
            {floorsY.map(y => (
                <g key={y}>
                    {windowGrid(rand, 150 - half + 6, y + 6, cols, 1, 12, 14, gap)}
                    {y > top && balcony(150 - half - 6, 150 + half + 6, y + 22)}
                </g>
            ))}
        </g>
    );
}

/** Low stone farmhouse with a dovecote tower and a pair of cypresses */
function farmhouse(type: Property['type'], rand: Rand): ReactNode {
    const top = type === 'HOTEL' ? 212 : 226;
    const rows = type === 'HOTEL' ? 3 : 2;
    return (
        <g>
            <ellipse cx={58} cy={BASE - 30} rx={8} ry={32} fill={NIGHT} />
            <ellipse cx={74} cy={BASE - 22} rx={6} ry={24} fill={NIGHT} />
            <rect x={188} y={top - 30} width={30} height={BASE - top + 30} fill={DEEP} />
            <path d={`M182 ${top - 28} L203 ${top - 44} L224 ${top - 28}`} {...roofStroke} />
            <rect x={198} y={top - 20} width={10} height={12} rx={5} fill={lit(rand)} />
            <rect x={88} y={top} width={104} height={BASE - top} fill={DEEP} />
            <path d={`M80 ${top + 4} L140 ${top - 16} L198 ${top + 4}`} {...roofStroke} />
            {windowGrid(rand, 100, top + 12, 4, rows, 12, 14, 12)}
            <rect x={134} y={BASE - 24} width={16} height={24} rx={8} fill={NIGHT} />
        </g>
    );
}

/** Low whitewashed block: flat roof, a balcony on every floor */
function seaBlock(type: Property['type'], rand: Rand): ReactNode {
    const floors = type === 'HOTEL' ? 4 : 3;
    const top = BASE - floors * 26;
    return (
        <g>
            <rect x={86} y={top} width={128} height={BASE - top} fill={DEEP} />
            <path d={`M82 ${top} H218`} stroke={PALE} strokeWidth={5} strokeLinecap='round' />
            {Array.from({ length: floors }, (_, f) => (
                <g key={f}>
                    {windowGrid(rand, 98, top + 6 + f * 26, 5, 1, 12, 13, 10)}
                    {f > 0 && balcony(92, 208, top + f * 26 + 20)}
                </g>
            ))}
        </g>
    );
}

function building(type: Property['type'], setting: StaySetting, rand: Rand): ReactNode {
    if (setting === 'mountain') return chalet(type, rand);
    if (setting === 'countryside') return farmhouse(type, rand);
    if (setting === 'coast') return type === 'HOUSE' ? gabledHouse(rand) : seaBlock(type, rand);
    return cityBuilding(type, rand);
}

const placeStay = (side: Side, shift: number) =>
    `translate(${W / 2 + side * shift} ${GROUND}) scale(0.84) translate(-150 -${BASE})`;

/** Stars, backdrop and building for one stay, seeded by its id so it always draws the same */
export function drawScene(property: Pick<Property, 'id' | 'type'>, setting: StaySetting) {
    const rand = seededRandom(`${property.id}:${setting}`);
    const side: Side = rand() < 0.5 ? -1 : 1;
    const shift = between(rand, 34, 50);
    return {
        stars: Array.from({ length: 12 }, () => ({
            x: rand() * W,
            y: between(rand, 70, 170),
            r: between(rand, 0.8, 1.6)
        })),
        scene: (
            <>
                {BACKDROPS[setting](rand, side)}
                <path d={`M-10 ${GROUND} H${W + 10} V${H} H-10Z`} fill={NIGHT} />
                <g transform={placeStay(side, shift)}>{building(property.type, setting, rand)}</g>
            </>
        )
    };
}
