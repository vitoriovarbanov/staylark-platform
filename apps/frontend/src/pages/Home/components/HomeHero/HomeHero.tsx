import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Title, Text, Button, Autocomplete } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconMapPin, IconCalendar } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { RooflineField } from '@/components/RooflineField/RooflineField';
import { useAuth } from '@/contexts/auth-context';
import { useCities } from '@/hooks/api/use-properties';
import { HeroTowns } from './HeroTowns';
import classes from './HomeHero.module.css';

export function HomeHero() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: citiesData } = useCities();
    const [city, setCity] = useState('');
    const [checkIn, setCheckIn] = useState<Date | null>(null);
    const [checkOut, setCheckOut] = useState<Date | null>(null);

    const firstName = user?.name?.trim().split(/\s+/)[0];

    const handleSearch = (e?: React.FormEvent) => {
        e?.preventDefault();
        const params = new URLSearchParams();
        if (city.trim()) params.set('city', city.trim());
        if (checkIn) params.set('checkIn', dayjs(checkIn).format('YYYY-MM-DD'));
        if (checkOut) params.set('checkOut', dayjs(checkOut).format('YYYY-MM-DD'));
        navigate(`/properties?${params.toString()}`);
    };

    return (
        <section className={classes.hero} aria-labelledby='home-hero-title'>
            <div className={classes.band}>
                <RooflineField tone='dusk' contained windows={false} />

                <div className={classes.inner}>
                    <div className={classes.copy}>
                        <Title order={1} id='home-hero-title' className={classes.title}>
                            {firstName ? `Where to next, ${firstName}?` : 'Where to next?'}
                        </Title>
                        <Text className={classes.subtitle}>Search by city and dates to see what&apos;s free.</Text>
                    </div>

                    <HeroTowns />
                </div>
            </div>

            <form id='home-search' className={classes.search} onSubmit={handleSearch}>
                <Autocomplete
                    label='Where'
                    placeholder='Search a city'
                    leftSection={<IconMapPin size={18} stroke={1.8} />}
                    data={citiesData?.data ?? []}
                    value={city}
                    onChange={setCity}
                    limit={5}
                    size='md'
                    className={classes.where}
                />
                <DatePickerInput
                    label='Check-in'
                    placeholder='Add date'
                    leftSection={<IconCalendar size={18} stroke={1.8} />}
                    value={checkIn}
                    onChange={setCheckIn}
                    minDate={new Date()}
                    maxDate={checkOut ?? undefined}
                    size='md'
                    clearable
                    className={classes.date}
                />
                <DatePickerInput
                    label='Check-out'
                    placeholder='Add date'
                    leftSection={<IconCalendar size={18} stroke={1.8} />}
                    value={checkOut}
                    onChange={setCheckOut}
                    minDate={checkIn ?? new Date()}
                    size='md'
                    clearable
                    className={classes.date}
                />
                <Button type='submit' size='md' className={classes.submit}>
                    Search stays
                </Button>
            </form>
        </section>
    );
}
