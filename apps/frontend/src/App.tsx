import { BrowserRouter, Routes, Route } from 'react-router';
import { SignInPage } from '@/pages/auth/SignInPage';
import { SignUpPage } from '@/pages/auth/SignUpPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage';
import { AcceptInvitePage } from '@/pages/auth/AcceptInvitePage/AcceptInvitePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PropertiesPage } from '@/pages/Properties/PropertiesPage';
import { PropertyDetailPage } from '@/pages/Properties/PropertiesDetails/PropertyDetailPage';
import { HomePage } from '@/pages/Home/HomePage';
import { AdminPropertiesPage } from '@/pages/admin/AdminPropertiesPage/AdminPropertiesPage';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage/AdminDashboardPage';
import { AdminBookingsPage } from '@/pages/admin/AdminBookingsPage/AdminBookingsPage';
import { AdminFeedbackPage } from '@/pages/admin/AdminFeedbackPage/AdminFeedbackPage';
import { AdminTicketsPage } from '@/pages/admin/AdminTicketsPage/AdminTicketsPage';
import { AdminTicketsOverviewPage } from '@/pages/admin/AdminTicketsOverviewPage/AdminTicketsOverviewPage';
import { AdminTicketRoutingPage } from '@/pages/admin/AdminTicketRoutingPage/AdminTicketRoutingPage';
import { AdminPricingPage } from '@/pages/admin/AdminPricingPage/AdminPricingPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage/AdminUsersPage';
import { AppShellLayout } from '@/layouts/AppShell/AppShell';
import { AdminLayout } from '@/layouts/AdminLayout/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute/ProtectedRoute';
import { AdminRoute } from '@/components/AdminRoute/AdminRoute';
import { GuestRoute } from '@/components/GuestRoute/GuestRoute';
import { BookingsRedirect } from '@/components/BookingsRedirect/BookingsRedirect';
import { TicketsPage } from '@/pages/Tickets/TicketsPage';
import { ProfilePage } from '@/pages/Profile/ProfilePage';
import { NotFoundPage } from '@/pages/NotFound/NotFoundPage';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Auth pages — guest only */}
                <Route
                    path='/sign-in'
                    element={
                        <GuestRoute>
                            <SignInPage />
                        </GuestRoute>
                    }
                />
                <Route
                    path='/sign-up'
                    element={
                        <GuestRoute>
                            <SignUpPage />
                        </GuestRoute>
                    }
                />
                <Route
                    path='/forgot-password'
                    element={
                        <GuestRoute>
                            <ForgotPasswordPage />
                        </GuestRoute>
                    }
                />
                <Route path='/reset-password' element={<ResetPasswordPage />} />
                <Route path='/accept-invite' element={<AcceptInvitePage />} />
                <Route path='/verify-email' element={<VerifyEmailPage />} />

                {/* All app routes — gated, inside AppShell.
                    ProtectedRoute wraps the shell (not the reverse) so the gate decides
                    before any chrome renders. */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<AppShellLayout />}>
                        <Route path='/' element={<HomePage />} />
                        <Route path='/properties' element={<PropertiesPage />} />
                        <Route path='/properties/:id' element={<PropertyDetailPage />} />
                        <Route
                            path='/dashboard'
                            element={
                                <AdminRoute requireRole='MANAGER'>
                                    <DashboardPage />
                                </AdminRoute>
                            }
                        />
                        <Route path='/bookings' element={<BookingsRedirect />} />
                        <Route path='/tickets' element={<TicketsPage />} />
                        <Route path='/profile' element={<ProfilePage />} />

                        {/* 404 — inside the gate, so an unknown URL still bounces to sign-in */}
                        <Route path='*' element={<NotFoundPage />} />
                    </Route>
                </Route>

                {/* Admin routes — separate layout with sidebar */}
                <Route element={<ProtectedRoute />}>
                    <Route
                        path='/admin'
                        element={
                            <AdminRoute>
                                <AdminLayout />
                            </AdminRoute>
                        }
                    >
                        <Route
                            index
                            element={
                                <AdminRoute requireRole='MANAGER'>
                                    <AdminDashboardPage />
                                </AdminRoute>
                            }
                        />
                        <Route
                            path='properties'
                            element={
                                <AdminRoute requireRole='MANAGER'>
                                    <AdminPropertiesPage />
                                </AdminRoute>
                            }
                        />
                        <Route
                            path='bookings'
                            element={
                                <AdminRoute requireRole='MANAGER'>
                                    <AdminBookingsPage />
                                </AdminRoute>
                            }
                        />
                        <Route
                            path='feedback'
                            element={
                                <AdminRoute requireRole='MANAGER'>
                                    <AdminFeedbackPage />
                                </AdminRoute>
                            }
                        />
                        <Route
                            path='tickets'
                            element={
                                <AdminRoute requireRole='MANAGER'>
                                    <AdminTicketsPage />
                                </AdminRoute>
                            }
                        />
                        <Route
                            path='ticket-overview'
                            element={
                                <AdminRoute requireRole='MANAGER'>
                                    <AdminTicketsOverviewPage />
                                </AdminRoute>
                            }
                        />
                        <Route
                            path='ticket-routing'
                            element={
                                // Shared: admins configure it, managers read it and may
                                // toggle only themselves. No requireRole — both staff roles.
                                <AdminRoute>
                                    <AdminTicketRoutingPage />
                                </AdminRoute>
                            }
                        />
                        <Route
                            path='users'
                            element={
                                <AdminRoute requireRole='ADMIN'>
                                    <AdminUsersPage />
                                </AdminRoute>
                            }
                        />
                        <Route
                            path='pricing'
                            element={
                                <AdminRoute requireRole='MANAGER'>
                                    <AdminPricingPage />
                                </AdminRoute>
                            }
                        />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
