import { HomeHero } from './components/HomeHero/HomeHero';
import { LiveAvailabilityBoard } from './components/LiveAvailabilityBoard/LiveAvailabilityBoard';
import { VoiceFeedbackShowcase } from './components/VoiceFeedbackShowcase/VoiceFeedbackShowcase';
import { ProblemResolutionShowcase } from './components/ProblemResolutionShowcase/ProblemResolutionShowcase';

export function HomePage() {
    return (
        <>
            <HomeHero />

            <LiveAvailabilityBoard />

            <VoiceFeedbackShowcase />
            <ProblemResolutionShowcase />
        </>
    );
}
