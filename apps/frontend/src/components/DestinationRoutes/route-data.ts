export interface City {
    name: string;
    x: number;
    y: number;
    featured?: boolean;
    emphasis?: boolean;
}

export const cities: City[] = [
    { name: 'Lisbon', x: 120, y: 380, featured: true },
    { name: 'Barcelona', x: 320, y: 280 },
    { name: 'Paris', x: 310, y: 170 },
    { name: 'Amsterdam', x: 380, y: 105, featured: true },
    { name: 'Berlin', x: 560, y: 140 },
    { name: 'Copenhagen', x: 500, y: 72 },
    { name: 'Stockholm', x: 500, y: 30 },
    { name: 'Vienna', x: 620, y: 260, featured: true },
    { name: 'Milan', x: 440, y: 310 },
    { name: 'Prague', x: 540, y: 200 },
    { name: 'Budapest', x: 620, y: 330 },
    { name: 'Sofia', x: 720, y: 370, featured: true, emphasis: true },
    { name: 'Athens', x: 680, y: 420, featured: true },
    { name: 'Dubrovnik', x: 600, y: 400 },
    { name: 'Dubai', x: 860, y: 390 },
    { name: 'Porto', x: 90, y: 310 },
    { name: 'Madrid', x: 210, y: 330 },
    { name: 'Lyon', x: 370, y: 240 },
    { name: 'Bucharest', x: 760, y: 310 },
    { name: 'Istanbul', x: 830, y: 340 }
];

export const routes: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [1, 8],
    [8, 7],
    [4, 9],
    [9, 7],
    [7, 10],
    [10, 11],
    [11, 12],
    [10, 13],
    [11, 14],
    [0, 15],
    [12, 14],
    [0, 16],
    [16, 1],
    [2, 17],
    [17, 8],
    [10, 18],
    [18, 11],
    [11, 19],
    [19, 14],
    [12, 19]
];

export function arcPath(x1: number, y1: number, x2: number, y2: number): string {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const bulge = dist * 0.25;
    const cx = mx - (dy / dist) * bulge;
    const cy = my + (dx / dist) * bulge;
    return `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`;
}
