import { useEffect, useState } from 'react';
import { Loader } from '@mantine/core';
import { AnimatePresence, motion } from 'motion/react';
import classes from './AnalyzingState.module.css';

// Rough narration of the real pipeline (transcribe → classify → summarise), with a
// little personality. Advances one step at a time and holds on the last line.
const MESSAGES = [
    'Listening to your recording…',
    'Transcribing every word…',
    'Reading between the lines…',
    'Gauging the sentiment…',
    'Picking out the highlights…',
    'Almost there…'
];

const STEPS = ['Transcribe', 'Score', 'Summarise'];

const STEP_MS = 2800;

export function AnalyzingState() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (index >= MESSAGES.length - 1) return;
        const id = window.setTimeout(() => setIndex(i => i + 1), STEP_MS);
        return () => window.clearTimeout(id);
    }, [index]);

    // Two messages map to each of the three pipeline steps.
    const activeStep = Math.min(Math.floor(index / 2), STEPS.length - 1);

    return (
        <div className={classes.processing} aria-live='polite'>
            <Loader size='lg' />

            <div className={classes.messageWrap}>
                <AnimatePresence mode='wait'>
                    <motion.span
                        key={index}
                        className={classes.message}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                    >
                        {MESSAGES[index]}
                    </motion.span>
                </AnimatePresence>
            </div>

            <div className={classes.steps} aria-hidden='true'>
                {STEPS.map((step, i) => (
                    <span key={step} style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                        {i > 0 && <span className={classes.sep}>·</span>}
                        <span
                            className={`${classes.step} ${
                                i < activeStep ? classes.stepDone : i === activeStep ? classes.stepActive : ''
                            }`}
                        >
                            {step}
                        </span>
                    </span>
                ))}
            </div>
        </div>
    );
}
