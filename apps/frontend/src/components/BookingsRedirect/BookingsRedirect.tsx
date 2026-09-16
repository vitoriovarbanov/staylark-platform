import { Navigate } from 'react-router';
import { useAuth } from '@/contexts/auth-context';
import { BookingsPage } from '@/pages/Bookings/BookingsPage';

export function BookingsRedirect() {
    const { user } = useAuth();

    // Only managers have an operational bookings view. An ADMIN sees the guest
    // page here, which is correct — they only have their own bookings.
    if (user?.role === 'MANAGER') {
        return <Navigate to='/admin/bookings' replace />;
    }

    return <BookingsPage />;
}
