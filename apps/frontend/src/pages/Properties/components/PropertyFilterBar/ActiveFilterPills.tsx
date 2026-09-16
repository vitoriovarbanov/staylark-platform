import { useMemo } from 'react';
import { IconX } from '@tabler/icons-react';
import type { PropertyType } from '@staylark/contract';
import dayjs from 'dayjs';
import classes from './PropertyFilterBar.module.css';

interface ActiveFilterPillsProps {
    urlCheckIn: string;
    urlCheckOut: string;
    urlType: PropertyType | '';
    urlMinPrice: number;
    urlMaxPrice: number;
    urlAmenities: string[];
    propertyTypes: { value: string; label: string }[];
    priceRange: [number, number];
    onUpdateParams: (updates: Record<string, string | undefined>) => void;
}

export function ActiveFilterPills({
    urlCheckIn,
    urlCheckOut,
    urlType,
    urlMinPrice,
    urlMaxPrice,
    urlAmenities,
    propertyTypes,
    priceRange,
    onUpdateParams
}: ActiveFilterPillsProps) {
    const pills = useMemo(() => {
        const result: { key: string; label: string; onClear: () => void }[] = [];

        if (urlCheckIn) {
            result.push({
                key: 'checkIn',
                label: `Check-in: ${dayjs(urlCheckIn).format('MMM D')}`,
                onClear: () => onUpdateParams({ checkIn: undefined })
            });
        }
        if (urlCheckOut) {
            result.push({
                key: 'checkOut',
                label: `Check-out: ${dayjs(urlCheckOut).format('MMM D')}`,
                onClear: () => onUpdateParams({ checkOut: undefined })
            });
        }
        if (urlType) {
            const typeLabel = propertyTypes.find(t => t.value === urlType)?.label ?? urlType;
            result.push({
                key: 'type',
                label: `Type: ${typeLabel}`,
                onClear: () => onUpdateParams({ type: undefined })
            });
        }
        if (urlMinPrice > priceRange[0] || urlMaxPrice < priceRange[1]) {
            result.push({
                key: 'price',
                label: `\u20AC${urlMinPrice}\u2013\u20AC${urlMaxPrice}`,
                onClear: () => onUpdateParams({ minPrice: undefined, maxPrice: undefined })
            });
        }
        for (const amenity of urlAmenities) {
            result.push({
                key: `amenity-${amenity}`,
                label: amenity.replace(/-/g, ' '),
                onClear: () => {
                    const remaining = urlAmenities.filter(a => a !== amenity);
                    onUpdateParams({ amenities: remaining.length > 0 ? remaining.join(',') : undefined });
                }
            });
        }

        return result;
    }, [
        urlCheckIn,
        urlCheckOut,
        urlType,
        urlMinPrice,
        urlMaxPrice,
        urlAmenities,
        propertyTypes,
        priceRange,
        onUpdateParams
    ]);

    if (pills.length === 0) return null;

    return (
        <div className={classes.filterPills}>
            {pills.map(pill => (
                <span key={pill.key} className={classes.filterPill}>
                    {pill.label}
                    <button
                        className={classes.filterPillClose}
                        onClick={pill.onClear}
                        aria-label={`Remove ${pill.label} filter`}
                        type='button'
                    >
                        <IconX size={12} />
                    </button>
                </span>
            ))}
        </div>
    );
}
