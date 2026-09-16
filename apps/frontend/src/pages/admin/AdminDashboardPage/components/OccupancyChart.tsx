import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import dayjs from 'dayjs';
import type { OccupancyPoint } from '@staylark/contract';
import { DashboardSection } from './DashboardSection';

// Rendered with Recharts directly rather than @mantine/charts' AreaChart: the
// Mantine wrapper nests each <Area> inside a <Fragment> (for its gradient defs),
// and Recharts 2.15 + React 19 fails to detect chart elements inside Fragments,
// so the area never mounts. Mantine BarChart renders <Bar> as a direct child and
// is unaffected. Rendering <Area> as a direct child here sidesteps the bug while
// keeping Mantine theme colors via CSS variables.
const STROKE = 'var(--mantine-color-brand-6)';
const FILL = 'var(--mantine-color-brand-4)';
const GRID = 'var(--mantine-color-gray-3)';
const AXIS = 'var(--mantine-color-gray-6)';

export function OccupancyChart({ data }: { data: OccupancyPoint[] }) {
    const chartData = data.map(p => ({
        label: dayjs(`${p.month}-01`).format('MMM'),
        occupancy: p.occupancy
    }));

    return (
        <DashboardSection eyebrow='Trend' title='Occupancy' subtitle='Booked-nights share, last 6 months'>
            <ResponsiveContainer width='100%' height={260}>
                <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                    <defs>
                        <linearGradient id='occupancy-gradient' x1='0' y1='0' x2='0' y2='1'>
                            <stop offset='0%' stopColor={FILL} stopOpacity={0.35} />
                            <stop offset='100%' stopColor={FILL} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray='3 3' stroke={GRID} vertical={false} />
                    <XAxis
                        dataKey='label'
                        tickLine={false}
                        axisLine={{ stroke: GRID }}
                        tick={{ fill: AXIS, fontSize: 12 }}
                    />
                    <YAxis
                        domain={[0, 100]}
                        allowDecimals={false}
                        tickFormatter={value => `${value}%`}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: AXIS, fontSize: 12 }}
                        width={44}
                    />
                    <Tooltip
                        formatter={(value: number) => [`${value}%`, 'Occupancy']}
                        contentStyle={{
                            borderRadius: 8,
                            border: '1px solid var(--mantine-color-gray-3)',
                            fontSize: 12
                        }}
                    />
                    <Area
                        type='monotone'
                        dataKey='occupancy'
                        name='Occupancy'
                        stroke={STROKE}
                        strokeWidth={2}
                        fill='url(#occupancy-gradient)'
                        dot={false}
                        activeDot={{ r: 4, fill: STROKE }}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </DashboardSection>
    );
}
