import { Button, Image, Text } from '@mantine/core';
import { IconBuildingSkyscraper, IconPhoto } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import classes from './PhotoCarousel.module.css';
import FullScreenPhotoPreview from './FullScreenPhotoPreview';

interface PhotoCarouselProps {
    photos: string[];
    title: string;
}

export function PhotoCarousel({ photos, title }: PhotoCarouselProps) {
    const [lightboxOpened, setLightboxOpened] = useState(false);
    const [lightboxSlide, setLightboxSlide] = useState(0);

    const openLightbox = useCallback((index: number) => {
        setLightboxSlide(index);
        setLightboxOpened(true);
    }, []);

    if (photos.length === 0) {
        return (
            <div className={classes.noPhotos}>
                <IconBuildingSkyscraper size={48} stroke={1.2} color='rgba(255,255,255,0.5)' />
                <Text c='dimmed' mt='xs'>
                    No photos available
                </Text>
            </div>
        );
    }

    const displayPhotos = photos.slice(0, 3);
    const photoCount = photos.length;

    return (
        <>
            <div
                className={`${classes.mosaicGallery} ${
                    photoCount === 1
                        ? classes.mosaicSingle
                        : photoCount === 2
                          ? classes.mosaicDouble
                          : classes.mosaicTriple
                }`}
            >
                {displayPhotos.map((photo, i) => (
                    <button
                        key={i}
                        className={classes.mosaicCell}
                        style={i === 0 && photoCount >= 3 ? { gridRow: '1 / -1' } : undefined}
                        onClick={() => openLightbox(i)}
                        type='button'
                        aria-label={`View photo ${i + 1}`}
                    >
                        <Image
                            src={photo}
                            alt={`${title} — photo ${i + 1}`}
                            fit='cover'
                            h='100%'
                            w='100%'
                            loading={i === 0 ? 'eager' : 'lazy'}
                        />
                    </button>
                ))}

                {photoCount >= 3 && (
                    <Button
                        className={classes.showAllPhotos}
                        size='xs'
                        radius='md'
                        variant='white'
                        color='dark'
                        leftSection={<IconPhoto size={14} />}
                        onClick={() => openLightbox(0)}
                    >
                        Show all {photoCount} photos
                    </Button>
                )}
            </div>

            {lightboxOpened && (
                <FullScreenPhotoPreview
                    photos={photos}
                    title={title}
                    initialSlide={lightboxSlide}
                    opened={lightboxOpened}
                    onClose={() => setLightboxOpened(false)}
                />
            )}
        </>
    );
}
