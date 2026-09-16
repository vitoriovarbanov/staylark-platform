import { useState } from 'react';
import { RangeSlider, Chip, Text, Button, Drawer, Divider, Group } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { useAmenities } from '@/hooks/api/use-properties';
import classes from './PropertyFilterBar.module.css';

interface FilterDrawerProps {
    opened: boolean;
    onClose: () => void;
    urlMinPrice: number;
    urlMaxPrice: number;
    urlAmenities: string[];
    /** Number of active filters owned by the drawer (price + amenities). */
    drawerFilterCount: number;
    priceRange: [number, number];
    onUpdateParams: (updates: Record<string, string | undefined>) => void;
}

export function FilterDrawer({
    opened,
    onClose,
    urlMinPrice,
    urlMaxPrice,
    urlAmenities,
    drawerFilterCount,
    priceRange,
    onUpdateParams
}: FilterDrawerProps) {
    const { data: amenitiesData } = useAmenities();
    const amenitiesList = amenitiesData?.data ?? [];

    // Local slider state for smooth dragging, commits to URL on release
    const [localPriceRange, setLocalPriceRange] = useState<[number, number]>([urlMinPrice, urlMaxPrice]);

    function commitPriceRange(value: [number, number]) {
        onUpdateParams({
            minPrice: value[0] > priceRange[0] ? String(value[0]) : undefined,
            maxPrice: value[1] < priceRange[1] ? String(value[1]) : undefined
        });
    }

    function handleClearAll() {
        setLocalPriceRange(priceRange);
        onUpdateParams({
            minPrice: undefined,
            maxPrice: undefined,
            amenities: undefined
        });
    }

    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            position='right'
            size={380}
            title={null}
            withCloseButton={false}
            padding='md'
        >
            <div className={classes.filterDrawerBody}>
                <div className={classes.filterDrawerHeader}>
                    <Text fw={700} size='lg'>
                        More filters
                    </Text>
                    <Group gap='xs'>
                        {drawerFilterCount > 0 && (
                            <Button variant='subtle' size='compact-sm' color='gray' onClick={handleClearAll}>
                                Clear all
                            </Button>
                        )}
                        <Button variant='subtle' size='compact-sm' color='gray' onClick={onClose} px={4}>
                            <IconX size={18} />
                        </Button>
                    </Group>
                </div>

                <Divider mb='md' />

                <div className={classes.filterDrawerContent}>
                    <div className={classes.filterDrawerSection}>
                        <Text className={classes.filterDrawerSectionLabel}>Price per night</Text>
                        <Text size='sm' c='dimmed' mb={8}>
                            &euro;{localPriceRange[0]} &mdash; &euro;{localPriceRange[1]}
                        </Text>
                        <RangeSlider
                            min={priceRange[0]}
                            max={priceRange[1]}
                            step={10}
                            value={localPriceRange}
                            onChange={setLocalPriceRange}
                            onChangeEnd={commitPriceRange}
                            label={null}
                            minRange={10}
                        />
                    </div>

                    <div className={classes.filterDrawerSection}>
                        <Text className={classes.filterDrawerSectionLabel}>Amenities</Text>
                        <Chip.Group
                            multiple
                            value={urlAmenities}
                            onChange={(vals: string[]) =>
                                onUpdateParams({ amenities: vals.length > 0 ? vals.join(',') : undefined })
                            }
                        >
                            <Group gap='xs'>
                                {amenitiesList.map(a => (
                                    <Chip
                                        key={a}
                                        value={a}
                                        size='xs'
                                        variant='outline'
                                        style={{ textTransform: 'capitalize' }}
                                    >
                                        {a.replace(/-/g, ' ')}
                                    </Chip>
                                ))}
                            </Group>
                        </Chip.Group>
                    </div>
                </div>

                <div className={classes.filterDrawerFooter}>
                    <Button fullWidth onClick={onClose}>
                        Show results
                    </Button>
                </div>
            </div>
        </Drawer>
    );
}
