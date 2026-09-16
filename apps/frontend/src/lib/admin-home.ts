/**
 * The staff-portal landing page per role. MANAGER lands on their portfolio
 * dashboard (`/admin`), which is now scoped to the properties they manage.
 * ADMIN holds no operational access at all, so they land on user administration.
 */
export function adminHomePath(role: string | undefined): string {
    return role === 'ADMIN' ? '/admin/users' : '/admin';
}
