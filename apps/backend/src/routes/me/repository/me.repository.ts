import { db } from '../../../config/database.js';
import { BOOKING_STATUSES_OCCUPYING } from '@staylark/contract';

export const meRepository = {
    /** App-owned profile fields for the current user (name/image come from the session, not here). */
    findProfileFields: async (userId: string) => {
        return db.user.findUnique({
            where: { id: userId },
            select: { bio: true, homeCity: true, languages: true, phone: true }
        });
    },

    /** Occupying stays for travel stats: city + nights basis (checkIn/checkOut as DATE). */
    findStays: async (userId: string) => {
        return db.booking.findMany({
            where: { userId, status: { in: [...BOOKING_STATUSES_OCCUPYING] } },
            select: {
                checkIn: true,
                checkOut: true,
                property: { select: { city: true } }
            },
            orderBy: { checkIn: 'asc' }
        });
    },

    /** Writes only app-owned fields. undefined keys are skipped by Prisma. */
    updateProfileFields: async (
        userId: string,
        data: { bio?: string | null; homeCity?: string | null; languages?: string[]; phone?: string | null }
    ) => {
        return db.user.update({
            where: { id: userId },
            data,
            select: { bio: true, homeCity: true, languages: true, phone: true }
        });
    }
};
