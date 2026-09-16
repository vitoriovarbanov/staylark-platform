import { useState, useRef, useCallback, useEffect } from 'react';

type RecorderState = 'idle' | 'recording' | 'recorded';

const MAX_DURATION_MS = 3 * 60 * 1000; // 3 minutes

function getSupportedMimeType(): string {
    const types = ['audio/webm', 'audio/mp4', 'audio/ogg'];
    for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return 'audio/webm';
}

export function useAudioRecorder() {
    const [state, setState] = useState<RecorderState>('idle');
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [permissionDenied, setPermissionDenied] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(0);
    const audioUrlRef = useRef<string | null>(null);

    const cleanup = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        mediaRecorderRef.current = null;
    }, []);

    useEffect(() => {
        return () => {
            cleanup();
            if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        };
    }, [cleanup]);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mimeType = getSupportedMimeType();
            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = e => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                setAudioBlob(blob);
                if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
                const url = URL.createObjectURL(blob);
                audioUrlRef.current = url;
                setAudioUrl(url);
                setState('recorded');
                stream.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            };

            recorder.start();
            setState('recording');
            startTimeRef.current = Date.now();
            setElapsed(0);

            timerRef.current = setInterval(() => {
                const ms = Date.now() - startTimeRef.current;
                setElapsed(ms);
                if (ms >= MAX_DURATION_MS) {
                    recorder.stop();
                    if (timerRef.current) clearInterval(timerRef.current);
                }
            }, 1000);
        } catch (err) {
            setPermissionDenied(true);
            throw err;
        }
    }, []);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const reset = useCallback(() => {
        cleanup();
        if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
        }
        setAudioBlob(null);
        setAudioUrl(null);
        setElapsed(0);
        setState('idle');
    }, [cleanup]);

    return {
        state,
        audioBlob,
        audioUrl,
        elapsed,
        permissionDenied,
        startRecording,
        stopRecording,
        reset,
        cleanup,
        maxDuration: MAX_DURATION_MS
    };
}

export function audioBlobExtension(mimeType: string): string {
    if (mimeType === 'audio/mp4') return 'mp4';
    if (mimeType === 'audio/ogg') return 'ogg';
    return 'webm';
}
