import { Link } from 'react-router';
import classes from './StayJourney.module.css';

type Tone = 'plum' | 'good' | 'mixed' | 'urgent';

interface Step {
    title: string;
    text: string;
    link?: { to: string; label: string };
    example?: { quote: string; tags: { label: string; tone: Tone }[] };
}

const STEPS: Step[] = [
    {
        title: 'Book',
        text: 'Pick your dates and see the full price for those nights before you pay.'
    },
    {
        title: 'Arrive',
        text: 'Your dates and the address are in My bookings, on any device.',
        link: { to: '/bookings', label: 'Open My bookings' }
    },
    {
        title: 'Something wrong? Say it',
        text: 'Record what the problem is. We sort it, set how urgent it is and pass it to the person who can fix it.',
        example: {
            quote: "The bathroom tap won't stop dripping.",
            tags: [
                { label: 'Utilities', tone: 'plum' },
                { label: 'High priority', tone: 'urgent' },
                { label: 'Sent to the property manager', tone: 'plum' }
            ]
        }
    },
    {
        title: 'Tell us how it went',
        text: 'Record a short voice review after checkout. We pick out what mattered to you.',
        example: {
            quote: 'Spotless flat, loved the balcony, the Wi-Fi was slow.',
            tags: [
                { label: 'Cleanliness', tone: 'good' },
                { label: 'Balcony', tone: 'good' },
                { label: 'Wi-Fi', tone: 'mixed' }
            ]
        }
    }
];

export function StayJourney() {
    return (
        <section className={classes.section} aria-labelledby='stay-journey-title'>
            <h2 id='stay-journey-title' className={classes.title}>
                Your stay, start to finish
            </h2>
            <p className={classes.lede}>
                You can talk to Staylark instead of filling in forms. Here's where that helps.
            </p>

            <ol className={classes.steps}>
                {STEPS.map((step, i) => (
                    <li key={step.title} className={classes.step}>
                        <div className={classes.marker} aria-hidden='true'>
                            <svg viewBox='0 0 44 44'>
                                <path d='M4 42 V20 L22 6 L40 20 V42Z' />
                            </svg>
                            <b>{i + 1}</b>
                        </div>
                        <h3 className={classes.stepTitle}>{step.title}</h3>
                        <p className={classes.text}>{step.text}</p>
                        {step.example && (
                            <figure className={classes.example}>
                                <blockquote>{step.example.quote}</blockquote>
                                <figcaption className={classes.tags}>
                                    {step.example.tags.map(tag => (
                                        <span key={tag.label} className={classes.tag} data-tone={tag.tone}>
                                            {tag.label}
                                        </span>
                                    ))}
                                </figcaption>
                            </figure>
                        )}
                        {step.link && (
                            <Link to={step.link.to} className={classes.link}>
                                {step.link.label}
                            </Link>
                        )}
                    </li>
                ))}
            </ol>
        </section>
    );
}
