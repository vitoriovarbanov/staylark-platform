import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Title, Text, Button, Group, Autocomplete } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconSearch, IconMapPin, IconCalendar } from '@tabler/icons-react';
import { useCities } from '@/hooks/api/use-properties';
import { HomeRouteMap } from './components/HomeRouteMap/HomeRouteMap';
import { LiveAvailabilityBoard } from './components/LiveAvailabilityBoard/LiveAvailabilityBoard';
import { VoiceFeedbackShowcase } from './components/VoiceFeedbackShowcase/VoiceFeedbackShowcase';
import { ProblemResolutionShowcase } from './components/ProblemResolutionShowcase/ProblemResolutionShowcase';
import dayjs from 'dayjs';
import classes from './HomePage.module.css';

export function HomePage() {
    const navigate = useNavigate();
    const [city, setCity] = useState('');
    const { data: citiesData } = useCities();
    const citiesList = citiesData?.data ?? [];
    const [checkIn, setCheckIn] = useState<Date | null>(null);
    const [checkOut, setCheckOut] = useState<Date | null>(null);

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (city.trim()) params.set('city', city.trim());
        if (checkIn) params.set('checkIn', dayjs(checkIn).format('YYYY-MM-DD'));
        if (checkOut) params.set('checkOut', dayjs(checkOut).format('YYYY-MM-DD'));
        navigate(`/properties?${params.toString()}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    const handleCityClick = (cityName: string) => {
        navigate(`/properties?city=${encodeURIComponent(cityName)}`);
    };

    return (
        <>
            <div className={classes.hero}>
                <div className={classes.heroGradient} />

                <div className={classes.heroHeader}>
                    <Title order={1} className={classes.heroTitle}>
                        Find your next <span className={classes.heroAccent}>stay</span>
                    </Title>
                    <Text className={classes.heroSubtitle}>
                        Click any city on the map to explore available properties
                    </Text>
                </div>

                <div className={classes.mapArea}>
                    <HomeRouteMap onCityClick={handleCityClick} />
                </div>

                <div className={classes.searchBarWrapper}>
                    <div className={classes.searchBar}>
                        <div className={classes.searchCorner} data-position='top-left' />
                        <div className={classes.searchCorner} data-position='top-right' />
                        <div className={classes.searchCorner} data-position='bottom-left' />
                        <div className={classes.searchCorner} data-position='bottom-right' />
                        <Group grow wrap='wrap' gap='sm' className={classes.searchGroup}>
                            <Autocomplete
                                placeholder='Where?'
                                leftSection={<IconMapPin size={16} />}
                                data={citiesList}
                                value={city}
                                onChange={setCity}
                                onKeyDown={handleKeyDown}
                                limit={5}
                                size='md'
                                classNames={{ input: classes.searchInput }}
                            />
                            <DatePickerInput
                                placeholder='Check-in'
                                leftSection={<IconCalendar size={16} />}
                                value={checkIn}
                                onChange={setCheckIn}
                                minDate={new Date()}
                                maxDate={checkOut ?? undefined}
                                size='md'
                                clearable
                                classNames={{ input: classes.searchInput }}
                            />
                            <DatePickerInput
                                placeholder='Check-out'
                                leftSection={<IconCalendar size={16} />}
                                value={checkOut}
                                onChange={setCheckOut}
                                minDate={checkIn ?? new Date()}
                                size='md'
                                clearable
                                classNames={{ input: classes.searchInput }}
                            />
                            <Button size='md' leftSection={<IconSearch size={16} />} onClick={handleSearch}>
                                Search
                            </Button>
                        </Group>
                    </div>
                </div>
            </div>

            <LiveAvailabilityBoard />

            <VoiceFeedbackShowcase />
            <ProblemResolutionShowcase />
        </>
    );
}
