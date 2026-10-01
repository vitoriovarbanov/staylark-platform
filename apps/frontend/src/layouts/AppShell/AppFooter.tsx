import { Link } from 'react-router';
import { useAuth } from '@/contexts/auth-context';
import classes from './AppFooter.module.css';

const REPO_URL = 'https://github.com/vitoriovarbanov/staylark-platform';

interface FooterLink {
    label: string;
    to?: string;
    href?: string;
}

interface FooterColumn {
    title: string;
    links: FooterLink[];
    guestOnly?: boolean;
}

const COLUMNS: FooterColumn[] = [
    { title: 'Explore', links: [{ label: 'Browse all stays', to: '/properties' }] },
    {
        title: 'Your trips',
        guestOnly: true,
        links: [
            { label: 'Stays', to: '/bookings' },
            { label: 'Issue tracker', to: '/tickets' },
            { label: 'Profile', to: '/profile' }
        ]
    },
    {
        title: 'Staylark',
        links: [
            { label: 'Source code on GitHub', href: REPO_URL },
            { label: 'MIT licence', href: `${REPO_URL}/blob/main/LICENSE` }
        ]
    }
];

export function AppFooter() {
    const { user } = useAuth();
    const isStaff = user?.role === 'ADMIN' || user?.role === 'MANAGER';
    const columns = COLUMNS.filter(c => !(c.guestOnly && isStaff));

    return (
        <footer className={classes.footer}>
            <div className={classes.inner}>
                <div className={classes.top}>
                    <div>
                        <Link to='/' className={classes.mark}>
                            <svg viewBox='0 0 48 48' aria-hidden='true'>
                                <path d='M4.5 29 24 10 43.5 29' strokeWidth='5' strokeLinejoin='round' />
                                <path d='M11.5 35.5c6.5-6.5 13.5-5.5 21 2' strokeWidth='4.6' className={classes.wing} />
                            </svg>
                            Staylark
                        </Link>
                        <p className={classes.tagline}>
                            Stays across Europe, booked in a few taps. Talk to us when something&apos;s wrong.
                        </p>
                    </div>

                    <nav className={classes.columns} aria-label='Footer'>
                        {columns.map(column => (
                            <div key={column.title}>
                                <h2 className={classes.heading}>{column.title}</h2>
                                <ul className={classes.list}>
                                    {column.links.map(link => (
                                        <li key={link.label}>
                                            {link.to ? (
                                                <Link to={link.to} className={classes.link}>
                                                    {link.label}
                                                </Link>
                                            ) : (
                                                <a
                                                    href={link.href}
                                                    className={classes.link}
                                                    target='_blank'
                                                    rel='noreferrer'
                                                >
                                                    {link.label}
                                                </a>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </nav>
                </div>

                <div className={classes.fine}>
                    <span>© {new Date().getFullYear()} Staylark. Open source under the MIT licence.</span>
                    <span>Prices in euros, per night.</span>
                </div>
            </div>
        </footer>
    );
}
