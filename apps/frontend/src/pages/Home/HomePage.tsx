import { HomeHero } from './components/HomeHero/HomeHero';
import { StayStreet } from './components/StayStreet/StayStreet';
import { StayJourney } from './components/StayJourney/StayJourney';

export function HomePage() {
    return (
        <>
            <HomeHero />
            <StayStreet />
            <StayJourney />
        </>
    );
}
