import { useCallback, useRef, useState } from 'react';
import { IconPlayerPlayFilled, IconPlayerPauseFilled } from '@tabler/icons-react';
import classes from './AudioPlayer.module.css';

interface AudioPlayerProps {
    src: string;
    /** Optional mono eyebrow label, e.g. "Playback · Your recording". */
    label?: string;
}

function formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Reusable voice player styled as a navy "studio console" with an amber seek bar.
 * Replaces the raw <audio> element everywhere recordings are played back.
 */
export function AudioPlayer({ src, label }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const fixingDuration = useRef(false);
    const [playing, setPlaying] = useState(false);
    const [current, setCurrent] = useState(0);
    const [duration, setDuration] = useState(0);

    const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

    const toggle = useCallback(() => {
        const a = audioRef.current;
        if (!a) return;
        if (a.paused) void a.play();
        else a.pause();
    }, []);

    // MediaRecorder webm blobs report `duration: Infinity` until a seek forces the
    // browser to compute it — nudge the playhead, read the real duration, reset.
    const handleLoadedMetadata = useCallback(() => {
        const a = audioRef.current;
        if (!a) return;
        if ((a.duration === Infinity || Number.isNaN(a.duration)) && !fixingDuration.current) {
            fixingDuration.current = true;
            const onFix = () => {
                a.removeEventListener('timeupdate', onFix);
                a.currentTime = 0;
                fixingDuration.current = false;
                setDuration(Number.isFinite(a.duration) ? a.duration : 0);
            };
            a.addEventListener('timeupdate', onFix);
            a.currentTime = 1e7;
        } else {
            setDuration(a.duration);
        }
    }, []);

    const seekToClientX = useCallback((clientX: number) => {
        const a = audioRef.current;
        const track = trackRef.current;
        if (!a || !track || !Number.isFinite(a.duration) || a.duration <= 0) return;
        const rect = track.getBoundingClientRect();
        const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        a.currentTime = ratio * a.duration;
        setCurrent(a.currentTime);
    }, []);

    const handlePointerDown = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            e.preventDefault();
            seekToClientX(e.clientX);
            const move = (ev: PointerEvent) => seekToClientX(ev.clientX);
            const up = () => {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', up);
            };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
        },
        [seekToClientX]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLDivElement>) => {
            const a = audioRef.current;
            if (!a || !Number.isFinite(a.duration)) return;
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                a.currentTime = Math.min(a.duration, a.currentTime + 5);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                a.currentTime = Math.max(0, a.currentTime - 5);
            } else if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                toggle();
            }
        },
        [toggle]
    );

    return (
        <div className={classes.player}>
            {label && (
                <span className={classes.eyebrow}>
                    <span className={classes.dot} aria-hidden='true' />
                    {label}
                </span>
            )}

            <div className={classes.controls}>
                <button
                    type='button'
                    className={classes.playButton}
                    onClick={toggle}
                    aria-label={playing ? 'Pause recording' : 'Play recording'}
                >
                    {playing ? <IconPlayerPauseFilled size={18} /> : <IconPlayerPlayFilled size={18} />}
                </button>

                <div
                    ref={trackRef}
                    className={classes.track}
                    onPointerDown={handlePointerDown}
                    onKeyDown={handleKeyDown}
                    role='slider'
                    tabIndex={0}
                    aria-label='Seek'
                    aria-valuemin={0}
                    aria-valuemax={Math.floor(duration)}
                    aria-valuenow={Math.floor(current)}
                    aria-valuetext={`${formatTime(current)} of ${formatTime(duration)}`}
                >
                    <div className={classes.fill} style={{ width: `${pct}%` }} />
                    <div className={classes.thumb} style={{ left: `${pct}%` }} />
                </div>

                <span className={classes.time}>
                    {formatTime(current)}&nbsp;/&nbsp;{formatTime(duration)}
                </span>
            </div>

            <audio
                ref={audioRef}
                src={src}
                preload='metadata'
                onLoadedMetadata={handleLoadedMetadata}
                onDurationChange={() => {
                    const a = audioRef.current;
                    if (a && Number.isFinite(a.duration)) setDuration(a.duration);
                }}
                onTimeUpdate={() => {
                    const a = audioRef.current;
                    if (a && !fixingDuration.current) setCurrent(a.currentTime);
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
            />
        </div>
    );
}
