import { ActionIcon, CloseButton, Modal, Text } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import classes from './PhotoCarousel.module.css';

function FullScreenPhotoPreview({
    photos,
    title,
    initialSlide,
    opened,
    onClose
}: {
    photos: string[];
    title: string;
    initialSlide: number;
    opened: boolean;
    onClose: () => void;
}) {
    const [current, setCurrent] = useState(initialSlide);
    const touchStartX = useRef(0);

    const goNext = useCallback(() => {
        setCurrent(prev => (prev + 1) % photos.length);
    }, [photos.length]);

    const goPrev = useCallback(() => {
        setCurrent(prev => (prev - 1 + photos.length) % photos.length);
    }, [photos.length]);

    // Keyboard navigation
    useEffect(() => {
        if (!opened) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') goNext();
            else if (e.key === 'ArrowLeft') goPrev();
            else if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [opened, goNext, goPrev, onClose]);

    // Touch swipe
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
            if (diff > 0) goNext();
            else goPrev();
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            fullScreen
            withCloseButton={false}
            classNames={{ body: classes.lightboxBody, content: classes.lightboxContent }}
        >
            {/* Top bar: counter + close */}
            <div className={classes.lightboxTopBar}>
                <Text className={classes.lightboxCounter} c='white' size='sm' fw={500}>
                    {current + 1} / {photos.length}
                </Text>
                <CloseButton
                    className={classes.lightboxClose}
                    size='lg'
                    variant='subtle'
                    c='white'
                    onClick={onClose}
                    aria-label='Close gallery'
                />
            </div>

            {/* Image area with swipe support */}
            <div className={classes.lightboxImageArea} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                {/* Prev button */}
                {photos.length > 1 && (
                    <ActionIcon
                        className={classes.lightboxPrev}
                        variant='subtle'
                        size='xl'
                        radius='xl'
                        onClick={goPrev}
                        aria-label='Previous photo'
                    >
                        <IconChevronLeft size={28} color='white' />
                    </ActionIcon>
                )}

                <img
                    key={current}
                    src={photos[current]}
                    alt={`${title} — photo ${current + 1}`}
                    className={classes.lightboxImage}
                />

                {/* Next button */}
                {photos.length > 1 && (
                    <ActionIcon
                        className={classes.lightboxNext}
                        variant='subtle'
                        size='xl'
                        radius='xl'
                        onClick={goNext}
                        aria-label='Next photo'
                    >
                        <IconChevronRight size={28} color='white' />
                    </ActionIcon>
                )}
            </div>

            {/* Dot indicators */}
            {photos.length > 1 && (
                <div className={classes.lightboxDots}>
                    {photos.map((_, i) => (
                        <button
                            key={i}
                            className={classes.lightboxDot}
                            data-active={i === current}
                            onClick={() => setCurrent(i)}
                            type='button'
                            aria-label={`Go to photo ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </Modal>
    );
}

export default FullScreenPhotoPreview;
