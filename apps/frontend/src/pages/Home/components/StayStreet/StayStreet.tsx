import { Link } from 'react-router';
import { Button } from '@mantine/core';
import dayjs from 'dayjs';
import { lookupCityGeo, type Property } from '@staylark/contract';
import { useProperties, usePropertiesAvailabilityStatus } from '@/hooks/api/use-properties';
import { StayScene } from './StayScene';
import { staySetting } from './stay-setting';
import classes from './StayStreet.module.css';

const STREET_SIZE = 4;

// Uneven roof heights so the row reads as a street, not a card grid
const HOUSE_HEIGHTS = [400, 440, 380, 420];

const typeLabels: Record<Property['type'], string> = {
    APARTMENT: 'apartment',
    HOUSE: 'house',
    HOTEL: 'hotel'
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function StayStreet() {
    const { data, isLoading, isError, refetch } = useProperties({ page: 1, limit: STREET_SIZE });
    const properties = data?.data ?? [];
    const { data: statuses } = usePropertiesAvailabilityStatus(properties.map(p => p.id));

    const total = data?.total ?? 0;
    const showsAll = total > 0 && total <= STREET_SIZE;
    const countries = new Set(properties.map(p => lookupCityGeo(p.city).country)).size;

    return (
        <section className={classes.section} aria-labelledby='stay-street-title'>
            <div className={classes.head}>
                <div>
                    <h2 id='stay-street-title' className={classes.title}>
                        {showsAll ? 'Every stay, tonight' : 'Stays for tonight'}
                    </h2>
                    <p className={classes.lede}>
                        A lit window means the place is free tonight, {dayjs().format('ddd D MMM')}. Prices are per
                        night and move with the season.
                    </p>
                </div>
                <div className={classes.legend} aria-hidden='true'>
                    <span>
                        <i className={classes.legendLit} />
                        Free tonight
                    </span>
                    <span>
                        <i className={classes.legendDark} />
                        Booked
                    </span>
                </div>
            </div>

            {isError ? (
                <div className={classes.message}>
                    <p>Stays didn't load. Check your connection and try again.</p>
                    <Button variant='light' onClick={() => refetch()}>
                        Try again
                    </Button>
                </div>
            ) : !isLoading && properties.length === 0 ? (
                <div className={classes.message}>
                    <p>No stays are listed yet. New places will show up here.</p>
                </div>
            ) : (
                <div className={classes.street}>
                    {isLoading
                        ? HOUSE_HEIGHTS.map((h, i) => (
                              <div
                                  key={i}
                                  className={`${classes.house} ${classes.skeleton}`}
                                  style={{ '--house-h': `${h}px` } as React.CSSProperties}
                                  aria-hidden='true'
                              />
                          ))
                        : properties.map((property, i) => {
                              const status = statuses?.[property.id];
                              const free = status !== 'BOOKED';
                              const tonight = status ? (free ? 'Free tonight' : 'Booked tonight') : '';

                              return (
                                  <Link
                                      key={property.id}
                                      to={`/properties/${property.id}`}
                                      className={classes.house}
                                      style={
                                          {
                                              '--house-h': `${HOUSE_HEIGHTS[i % HOUSE_HEIGHTS.length]}px`
                                          } as React.CSSProperties
                                      }
                                      aria-label={`${property.title}, ${property.city}, €${property.nightlyPrice} a night${tonight ? `, ${tonight.toLowerCase()}` : ''}`}
                                  >
                                      <StayScene
                                          className={classes.scene}
                                          property={property}
                                          setting={staySetting(property)}
                                      />
                                      <span className={classes.shade} />
                                      <span
                                          className={classes.window}
                                          data-state={status ? (free ? 'lit' : 'dark') : undefined}
                                      />
                                      <div className={classes.body}>
                                          <div className={classes.city}>
                                              {property.city}, {typeLabels[property.type]} for {property.maxGuests}
                                          </div>
                                          <div className={classes.name}>{property.title}</div>
                                          <div className={classes.meta}>
                                              <span>{tonight}</span>
                                              <span className={classes.price}>
                                                  €{property.nightlyPrice} <small>a night</small>
                                              </span>
                                          </div>
                                      </div>
                                  </Link>
                              );
                          })}
                </div>
            )}

            {properties.length > 0 && (
                <div className={classes.foot}>
                    <span>
                        {showsAll
                            ? `${plural(total, 'stay', 'stays')} in ${plural(countries, 'country', 'countries')}.`
                            : `Showing ${properties.length} of ${total} stays.`}
                    </span>
                    <Link to='/properties' className={classes.all}>
                        Browse all stays
                    </Link>
                </div>
            )}
        </section>
    );
}
