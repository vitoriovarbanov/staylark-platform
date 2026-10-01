import { Button } from '@mantine/core';
import { RooflineField } from '@/components/RooflineField/RooflineField';
import classes from './HomeClosing.module.css';

// The hero's search form carries this id
const SEARCH_ID = 'home-search';

/** Bookends the page: it closes in the same dusk the hero opens with, and joins the footer. */
export function HomeClosing() {
    const goToSearch = () => {
        const form = document.getElementById(SEARCH_ID);
        if (!form) return;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        form.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        form.querySelector('input')?.focus({ preventScroll: true });
    };

    return (
        <section className={classes.closing} aria-labelledby='home-closing-title'>
            <RooflineField tone='dusk' contained />

            <div className={classes.inner}>
                <div>
                    <h2 id='home-closing-title' className={classes.title}>
                        Pick your dates while the lights are on
                    </h2>
                    <p className={classes.lede}>Every stay shows the full price for your nights before you pay.</p>
                </div>
                <Button size='lg' className={classes.cta} onClick={goToSearch}>
                    Search stays
                </Button>
            </div>
        </section>
    );
}
