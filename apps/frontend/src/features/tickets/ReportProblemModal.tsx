import { Loader, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { Ticket } from '@staylark/contract';
import { IconMapPin, IconCalendar } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useCallback, useState } from 'react';
import { useSubmitTicket } from '@/hooks/api/use-tickets';
import { RecordingActive } from '@/features/audio-recording/components/RecordingActive';
import { RecordingReady } from '@/features/audio-recording/components/RecordingReady';
import type { RecordingReadyCopy } from '@/features/audio-recording/components/RecordingReady';
import { RecordingReview } from '@/features/audio-recording/components/RecordingReview';
import { useAudioRecorder } from '@/features/audio-recording/hooks/useAudioRecorder';
import { BrandedModal } from '@/components/BrandedModal/BrandedModal';
import { ResultCard } from './components/ResultCard';
import classes from './ReportProblemModal.module.css';

export interface ReportableBooking {
    bookingId: string;
    propertyId: string;
    propertyName: string;
    propertyCity: string;
    checkIn: string;
    checkOut: string;
}

interface ReportProblemModalProps {
    opened: boolean;
    onClose: () => void;
    booking: ReportableBooking | null;
}

const REPORT_READY_COPY: RecordingReadyCopy = {
    micHint: 'Tap to describe the problem',
    micRetryHint: 'Tap to try again',
    deniedAlertTitle: 'Microphone access blocked',
    deniedAlertBody:
        'To record, allow microphone access in your browser settings — or just type your report below, it works just as well.',
    dividerLabel: 'or type your report',
    textPlaceholder: "Describe what's happening — the more detail, the better we can help.",
    submitLabel: 'Submit report',
    micAriaLabel: 'Start recording your problem report',
    textAriaLabel: 'Type your problem report',
    submitAriaLabel: 'Submit your problem report'
};

type FlowState = 'ready' | 'recording' | 'review' | 'submitting' | 'results';

export function ReportProblemModal({ opened, onClose, booking }: ReportProblemModalProps) {
    const [flowState, setFlowState] = useState<FlowState>('ready');
    const [textValue, setTextValue] = useState('');
    const [result, setResult] = useState<Ticket | null>(null);

    const recorder = useAudioRecorder();
    const submitMutation = useSubmitTicket();

    const resetAll = useCallback(() => {
        recorder.reset();
        setTextValue('');
        setResult(null);
        setFlowState('ready');
    }, [recorder]);

    const handleClose = useCallback(() => {
        if (flowState === 'submitting') return;
        onClose();
        // Defer reset so the modal close animation doesn't flash the ready state
        window.setTimeout(resetAll, 200);
    }, [flowState, onClose, resetAll]);

    const handleStartRecording = useCallback(async () => {
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
        setFlowState('ready');
    }, [recorder]);

    const submitWith = useCallback(
        async (payload: { audio?: Blob; text?: string }) => {
            if (!booking) return;
            setFlowState('submitting');
            try {
                const response = await submitMutation.mutateAsync({
                    propertyId: booking.propertyId,
                    bookingId: booking.bookingId,
                    ...payload
                });
                setResult(response.data);
                setFlowState('results');
            } catch {
                setFlowState(payload.audio ? 'review' : 'ready');
                notifications.show({
                    title: 'Submission failed',
                    message: 'Could not submit your report. Please try again.',
                    color: 'red'
                });
            }
        },
        [booking, submitMutation]
    );

    const handleSubmitAudio = useCallback(() => {
        if (!recorder.audioBlob) return;
        submitWith({ audio: recorder.audioBlob });
    }, [recorder.audioBlob, submitWith]);

    const handleSubmitText = useCallback(() => {
        submitWith({ text: textValue.trim() });
    }, [submitWith, textValue]);

    const eyebrow = result ? `INCIDENT · ${result.id.slice(0, 5).toUpperCase()}` : 'NEW INCIDENT REPORT';
    const title = result ? (result.summary ?? 'Report received') : booking ? booking.propertyName : 'Report a problem';

    return (
        <BrandedModal
            opened={opened}
            onClose={handleClose}
            eyebrow={eyebrow}
            title={title}
            size='lg'
            tone={result?.priority === 'CRITICAL' || result?.category === 'EMERGENCY' ? 'urgent' : 'neutral'}
            closeOnEscape={flowState !== 'submitting'}
            closeOnClickOutside={flowState !== 'submitting'}
        >
            {booking && flowState !== 'results' && (
                <div className={classes.bookingMeta}>
                    <div className={classes.bookingMetaRow}>
                        <IconMapPin size={14} />
                        <Text size='sm'>{booking.propertyCity}</Text>
                    </div>
                    <div className={classes.bookingMetaRow}>
                        <IconCalendar size={14} />
                        <Text size='sm'>
                            {dayjs(booking.checkIn).format('D MMM')} — {dayjs(booking.checkOut).format('D MMM YYYY')}
                        </Text>
                    </div>
                </div>
            )}

            {flowState === 'ready' && (
                <RecordingReady
                    onStartRecording={handleStartRecording}
                    permissionDenied={recorder.permissionDenied}
                    textValue={textValue}
                    onTextChange={setTextValue}
                    onSubmitText={handleSubmitText}
                    isSubmitting={false}
                    copy={REPORT_READY_COPY}
                />
            )}

            {flowState === 'recording' && (
                <RecordingActive
                    elapsed={recorder.elapsed}
                    maxDuration={recorder.maxDuration}
                    onStop={handleStopRecording}
                    stopAriaLabel='Stop recording your report'
                />
            )}

            {flowState === 'review' && (
                <RecordingReview
                    audioUrl={recorder.audioUrl}
                    onReRecord={handleReRecord}
                    onSubmit={handleSubmitAudio}
                    isSubmitting={false}
                    submitLabel='Submit report'
                    submitAriaLabel='Submit your problem report'
                />
            )}

            {flowState === 'submitting' && (
                <div className={classes.processing} aria-live='polite'>
                    <Loader size='lg' />
                    <Text fw={600}>Analyzing your report…</Text>
                    <span className={classes.processingHint}>Transcribing · classifying · routing</span>
                </div>
            )}

            {flowState === 'results' && result && <ResultCard ticket={result} onDone={handleClose} />}
        </BrandedModal>
    );
}
