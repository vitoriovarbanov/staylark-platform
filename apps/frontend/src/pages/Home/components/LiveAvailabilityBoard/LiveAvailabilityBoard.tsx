import { Link } from 'react-router';
import { Container, Title, Group, Anchor, Text } from '@mantine/core';
import dayjs from 'dayjs';
import { useProperties, usePropertiesAvailabilityStatus } from '@/hooks/api/use-properties';
import classes from './LiveAvailabilityBoard.module.css';

const typeLabels: Record<string, string> = {
    APARTMENT: 'APT',
    HOUSE: 'HOUSE',
    HOTEL: 'HOTEL'
};

export function LiveAvailabilityBoard() {
    const { data, isLoading } = useProperties({ page: 1, limit: 6 });
    const properties = data?.data ?? [];
    const { data: statuses } = usePropertiesAvailabilityStatus(properties.map(p => p.id));
    const tonightLabel = dayjs().format('ddd D MMM');

    return (
        <Container size='lg' py='xl'>
            <Group justify='space-between' align='flex-end' mb='lg'>
                <div>
                    <Group gap='sm' align='center'>
                        <div className={classes.liveDot} />
                        <Title order={3} className={classes.sectionTitle}>
                            Live Availability
                        </Title>
                    </Group>
                    <Text component='span' c='dimmed' className={classes.caption}>
                        Availability tonight &middot; {tonightLabel}
                    </Text>
                </div>
                <Anchor component={Link} to='/properties' size='sm' fw={500}>
                    View all
                </Anchor>
            </Group>

            <div className={classes.board}>
                <div className={classes.scanlines} />

                {/* Header row */}
                <div className={classes.headerRow}>
                    <span className={classes.colCity}>Destination</span>
                    <span className={classes.colName}>Property</span>
                    <span className={classes.colType}>Type</span>
                    <span className={classes.colPrice}>Rate</span>
                    <span className={classes.colStatus}>Tonight</span>
                </div>

                <div className={classes.divider} />

                {/* Data rows */}
                {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                          <div
                              key={i}
                              className={`${classes.row} ${classes.loadingRow}`}
                              style={{ animationDelay: `${i * 0.12}s` }}
                          >
                              <span className={classes.colCity}>———</span>
                              <span className={classes.colName}>————————</span>
                              <span className={classes.colType}>——</span>
                              <span className={classes.colPrice}>———</span>
                              <span className={classes.colStatus}>——</span>
                          </div>
                      ))
                    : properties.map((property, i) => {
                          // Until the status query resolves, optimistically show AVAIL.
                          const isBooked = statuses?.[property.id] === 'BOOKED';
                          return (
                              <Link
                                  key={property.id}
                                  to={`/properties/${property.id}`}
                                  className={classes.row}
                                  style={{ animationDelay: `${i * 0.12 + 0.2}s` }}
                              >
                                  <span className={classes.colCity}>{property.city.toUpperCase()}</span>
                                  <span className={classes.colName}>{property.title}</span>
                                  <span className={classes.colType}>
                                      <span className={classes.typeBadge}>
                                          {typeLabels[property.type] || property.type}
                                      </span>
                                  </span>
                                  <span className={classes.colPrice}>&euro;{property.nightlyPrice}/NT</span>
                                  <span className={`${classes.colStatus} ${isBooked ? classes.colStatusBooked : ''}`}>
                                      <span className={classes.statusDot} />
                                      {isBooked ? 'BOOKED' : 'AVAIL'}
                                  </span>
                              </Link>
                          );
                      })}

                {/* Empty state */}
                {!isLoading && properties.length === 0 && (
                    <div className={classes.emptyRow}>No properties available</div>
                )}
            </div>
        </Container>
    );
}
