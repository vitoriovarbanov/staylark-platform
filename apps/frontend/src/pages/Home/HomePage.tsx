import { HomeHero } from './components/HomeHero/HomeHero';
import { StayStreet } from './components/StayStreet/StayStreet';
import { StayJourney } from './components/StayJourney/StayJourney';
import { HomeClosing } from './components/HomeClosing/HomeClosing';

export function HomePage() {
    return (
        <>
            <HomeHero />
            <StayStreet />
            <StayJourney />
            <HomeClosing />
        </>
    );
}
