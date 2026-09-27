import { useId, useMemo } from 'react';
import type { Property } from '@staylark/contract';
import type { StaySetting } from './stay-setting';
import { DEEP, GLOW, H, NIGHT, W, drawScene } from './stay-scene.utils';

interface StaySceneProps {
    property: Pick<Property, 'id' | 'type'>;
    setting: StaySetting;
    className?: string;
}

export function StayScene({ property, setting, className }: StaySceneProps) {
    const skyId = useId();
    const { stars, scene } = useMemo(
        () => drawScene({ id: property.id, type: property.type }, setting),
        [property.id, property.type, setting]
    );

    return (
        <svg className={className} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio='xMidYMax slice' aria-hidden='true'>
            <defs>
                <linearGradient id={skyId} x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0' stopColor={NIGHT} />
                    <stop offset='0.26' stopColor={DEEP} />
                    <stop offset='0.42' stopColor='#6b2a55' />
                    <stop offset='0.53' stopColor={GLOW} />
                </linearGradient>
            </defs>
            <rect width={W} height={H} fill={`url(#${skyId})`} />
            {stars.map((s, i) => (
                <circle key={i} cx={s.x} cy={s.y} r={s.r} fill='#fff' opacity={0.55} />
            ))}
            {scene}
        </svg>
    );
}
