import { Stack, ActionIcon, Text, Alert, Divider, Textarea, Button } from '@mantine/core';
import { IconMicrophone, IconAlertCircle, IconSend } from '@tabler/icons-react';
import classes from './Recording.module.css';

export interface RecordingReadyCopy {
    micHint: string;
    micRetryHint: string;
    deniedAlertTitle: string;
    deniedAlertBody: string;
    dividerLabel: string;
    textPlaceholder: string;
    submitLabel: string;
    micAriaLabel: string;
    textAriaLabel: string;
    submitAriaLabel: string;
}

interface RecordingReadyProps {
    onStartRecording: () => void;
    permissionDenied: boolean;
    textValue: string;
    onTextChange: (value: string) => void;
    onSubmitText: () => void;
    isSubmitting: boolean;
    copy: RecordingReadyCopy;
}

export function RecordingReady({
    onStartRecording,
    permissionDenied,
    textValue,
    onTextChange,
    onSubmitText,
    isSubmitting,
    copy
}: RecordingReadyProps) {
    const canSubmitText = textValue.trim().length >= 10;

    return (
        <Stack gap='md' py='md'>
            {permissionDenied && (
                <Alert
                    icon={<IconAlertCircle size={16} />}
                    color='yellow'
                    variant='light'
                    title={copy.deniedAlertTitle}
                >
                    {copy.deniedAlertBody}
                </Alert>
            )}

            <Stack align='center' gap='xs'>
                <ActionIcon
                    size={80}
                    radius='xl'
                    variant='gradient'
                    gradient={{ from: 'brand', to: 'blue' }}
                    onClick={onStartRecording}
                    aria-label={copy.micAriaLabel}
                    className={classes.micButton}
                >
                    <IconMicrophone size={36} />
                </ActionIcon>
                <Text size='sm' c='dimmed'>
                    {permissionDenied ? copy.micRetryHint : copy.micHint}
                </Text>
            </Stack>

            <Divider label={copy.dividerLabel} labelPosition='center' />

            <Textarea
                placeholder={copy.textPlaceholder}
                autosize
                minRows={3}
                maxRows={6}
                value={textValue}
                onChange={e => onTextChange(e.currentTarget.value)}
                maxLength={2000}
                disabled={isSubmitting}
                aria-label={copy.textAriaLabel}
            />

            <Button
                fullWidth
                size='md'
                leftSection={<IconSend size={18} />}
                onClick={onSubmitText}
                loading={isSubmitting}
                disabled={!canSubmitText}
                aria-label={copy.submitAriaLabel}
            >
                {copy.submitLabel}
            </Button>
        </Stack>
    );
}
