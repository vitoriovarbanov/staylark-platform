import { Alert, Text } from '@mantine/core';
import type { EligibleBooking, Feedback } from '@staylark/contract';
import { IconMapPin, IconCalendar, IconAlertTriangle } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useCallback, useState } from 'react';
import { BrandedModal } from '@/components/BrandedModal/BrandedModal';
import { useSubmitFeedback } from '@/hooks/api/use-feedback';
import { RecordingActive } from '@/features/audio-recording/components/RecordingActive';
import { RecordingReady } from '@/features/audio-recording/components/RecordingReady';
import type { RecordingReadyCopy } from '@/features/audio-recording/components/RecordingReady';
import { RecordingReview } from '@/features/audio-recording/components/RecordingReview';
import { useAudioRecorder } from '@/features/audio-recording/hooks/useAudioRecorder';
import { FeedbackResults } from './components/FeedbackResults';
import { AnalyzingState } from './components/AnalyzingState';
import classes from './FeedbackModal.module.css';

export interface FeedbackModalProps {
    opened: boolean;
    onClose: () => void;
    booking: EligibleBooking | null;
    existingFeedback?: Feedback | null;
    onFeedbackSubmitted?: () => void;
}

const FEEDBACK_READY_COPY: RecordingReadyCopy = {
    micHint: 'Tap to record your experience',
    micRetryHint: 'Tap to try again',
    deniedAlertTitle: 'Microphone access blocked',
    deniedAlertBody: 'To record, allow microphone access in your browser settings — or just type your feedback below.',
    dividerLabel: 'or type your feedback',
    textPlaceholder: 'Describe your experience...',
    submitLabel: 'Submit feedback',
    micAriaLabel: 'Start recording your feedback',
    textAriaLabel: 'Type your feedback',
    submitAriaLabel: 'Submit your feedback'
};

type FlowState = 'ready' | 'recording' | 'review' | 'submitting' | 'results';

export function FeedbackModal({ opened, onClose, booking, existingFeedback, onFeedbackSubmitted }: FeedbackModalProps) {
    const [flowState, setFlowState] = useState<FlowState>(existingFeedback ? 'results' : 'ready');
    const [textValue, setTextValue] = useState('');
    const [result, setResult] = useState<Feedback | null>(existingFeedback ?? null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const recorder = useAudioRecorder();
    const submitMutation = useSubmitFeedback();

    // The modal stays mounted while its booking ticket is on screen, so `existingFeedback`
    // usually arrives from the query AFTER first mount — the `useState` initializer above
    // only sees the initial `null` and freezes on 'ready', showing the recorder over
    // already-submitted feedback on the first open. Re-seed the view from the latest
    // feedback on each open transition (React's "adjust state during render" pattern, no
    // effect). Guarded to fire only when `opened` flips true, so an in-progress recording
    // flow is never interrupted.
    const [wasOpened, setWasOpened] = useState(opened);
    if (opened !== wasOpened) {
        setWasOpened(opened);
        if (opened) {
            setResult(existingFeedback ?? null);
            setFlowState(existingFeedback ? 'results' : 'ready');
            setErrorMessage(null);
        }
    }

    const resetAll = useCallback(() => {
        recorder.reset();
        setTextValue('');
        setResult(existingFeedback ?? null);
        setErrorMessage(null);
        setFlowState(existingFeedback ? 'results' : 'ready');
    }, [recorder, existingFeedback]);

    const handleClose = useCallback(() => {
        if (flowState === 'submitting') return;
        onClose();
        window.setTimeout(resetAll, 200);
    }, [flowState, onClose, resetAll]);

    const handleStartRecording = useCallback(async () => {
        setErrorMessage(null);
        try {
            await recorder.startRecording();
            setFlowState('recording');
        } catch {
            // Permission denied — RecordingReady shows the alert
        }
    }, [recorder]);

    const handleStopRecording = useCallback(() => {
        recorder.stopRecording();
        setFlowState('review');
    }, [recorder]);

    const handleReRecord = useCallback(() => {
        recorder.reset();
        setErrorMessage(null);
        setFlowState('ready');
    }, [recorder]);

    const submitWith = useCallback(
        async (payload: { audio?: Blob; text?: string }) => {
            if (!booking) return;
            setErrorMessage(null);
            setFlowState('submitting');
            try {
                const response = await submitMutation.mutateAsync({
                    propertyId: booking.propertyId,
                    bookingId: booking.bookingId,
                    ...payload
                });
                setResult(response.data);
                setFlowState('results');
                onFeedbackSubmitted?.();
            } catch (err) {
                setFlowState(payload.audio ? 'review' : 'ready');
                // Surface the backend's specific reason (e.g. "couldn't make out any
                // speech") inline in the modal. The axios interceptor normalizes
                // errors to { message }.
                const message =
                    (err as { message?: string })?.message ?? 'Could not submit your feedback. Please try again.';
                setErrorMessage(message);
            }
        },
        [booking, submitMutation, onFeedbackSubmitted]
    );

    const handleSubmitAudio = useCallback(() => {
        if (!recorder.audioBlob) return;
        submitWith({ audio: recorder.audioBlob });
    }, [recorder.audioBlob, submitWith]);

    const handleSubmitText = useCallback(() => {
        submitWith({ text: textValue.trim() });
    }, [submitWith, textValue]);

    const eyebrow = existingFeedback ? 'YOUR FEEDBACK' : 'LEAVE FEEDBACK';
    const title = booking ? booking.propertyName : 'Voice feedback';

    return (
        <BrandedModal
            opened={opened}
            onClose={handleClose}
            eyebrow={eyebrow}
            title={title}
            size='lg'
            closeOnEscape={flowState !== 'submitting'}
            closeOnClickOutside={flowState !== 'submitting'}
            ariaLabel={existingFeedback ? 'View your feedback' : 'Leave feedback for your stay'}
        >
            {booking && flowState !== 'results' && (
                <div className={classes.bookingMeta}>
                    <div className={classes.bookingMetaRow}>
                        <IconMapPin size={14} />
                        <Text size='sm'>{booking.propertyCity}</Text>
                    </div>
                    <div className={classes.bookingMetaRow}>
                        <IconCalendar size={14} />
                        <Text size='sm'>Checked out {dayjs(booking.checkOutDate).format('D MMM YYYY')}</Text>
                    </div>
                </div>
            )}

            {errorMessage && (flowState === 'ready' || flowState === 'review') && (
                <Alert
                    color='red'
                    variant='light'
                    icon={<IconAlertTriangle size={18} />}
                    title="Couldn't process that recording"
                    withCloseButton
                    onClose={() => setErrorMessage(null)}
                    mb='md'
                >
                    {errorMessage}
                </Alert>
            )}

            {flowState === 'ready' && (
                <RecordingReady
                    onStartRecording={handleStartRecording}
                    permissionDenied={recorder.permissionDenied}
                    textValue={textValue}
                    onTextChange={setTextValue}
                    onSubmitText={handleSubmitText}
                    isSubmitting={false}
                    copy={FEEDBACK_READY_COPY}
                />
            )}

            {flowState === 'recording' && (
                <RecordingActive
                    elapsed={recorder.elapsed}
                    maxDuration={recorder.maxDuration}
                    onStop={handleStopRecording}
                    stopAriaLabel='Stop recording your feedback'
                />
            )}

            {flowState === 'review' && (
                <RecordingReview
                    audioUrl={recorder.audioUrl}
                    onReRecord={handleReRecord}
                    onSubmit={handleSubmitAudio}
                    isSubmitting={false}
                    submitLabel='Submit feedback'
                    submitAriaLabel='Submit your feedback'
                />
            )}

            {flowState === 'submitting' && <AnalyzingState />}

            {flowState === 'results' && result && <FeedbackResults feedback={result} onDone={handleClose} />}
        </BrandedModal>
    );
}
