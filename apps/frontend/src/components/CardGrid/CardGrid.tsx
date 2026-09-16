import { type ReactNode } from 'react';
import { SimpleGrid, Skeleton } from '@mantine/core';
import classes from './CardGrid.module.css';

interface CardGridProps<T> {
    data: T[];
    renderCard: (item: T) => ReactNode;
    getCardKey: (item: T) => string;
    isLoading?: boolean;
    skeletonCount?: number;
    onCardClick?: (item: T) => void;
    /** Responsive columns. Defaults to 1 / 2 / 3 at base / sm / lg. */
    cols?: { base?: number; sm?: number; lg?: number };
}

const DEFAULT_SKELETON_COUNT = 6;

export function CardGrid<T>({
    data,
    renderCard,
    getCardKey,
    isLoading = false,
    skeletonCount = DEFAULT_SKELETON_COUNT,
    onCardClick,
    cols = { base: 1, sm: 2, lg: 3 }
}: CardGridProps<T>) {
    return (
        <SimpleGrid cols={cols} spacing='md' verticalSpacing='md'>
            {isLoading
                ? Array.from({ length: skeletonCount }).map((_, i) => <Skeleton key={`sk-${i}`} h={150} radius='md' />)
                : data.map(item => {
                      const key = getCardKey(item);
                      const clickable = onCardClick !== undefined;
                      return (
                          <div
                              key={key}
                              role={clickable ? 'button' : undefined}
                              tabIndex={clickable ? 0 : undefined}
                              className={clickable ? classes.cardWrapper : undefined}
                              onClick={clickable ? () => onCardClick(item) : undefined}
                              onKeyDown={
                                  clickable
                                      ? e => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                onCardClick(item);
                                            }
                                        }
                                      : undefined
                              }
                              style={clickable ? { cursor: 'pointer' } : undefined}
                          >
                              {renderCard(item)}
                          </div>
                      );
                  })}
        </SimpleGrid>
    );
}
