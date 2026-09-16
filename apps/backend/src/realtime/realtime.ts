import { Server } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { TICKET_EVENT, type TicketEvent } from '@staylark/contract';
import { auth } from '../config/auth.js';
import { db } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let io: Server | null = null;

/**
 * Attaches Socket.IO to the http server. Handshake auth mirrors
 * auth.middleware.ts: validate the bearer token via Better Auth, then re-check
 * deletedAt so soft-deleted users can't hold a live socket.
 * The frontend sends the token in the handshake `auth` payload (never the URL).
 */
export function initRealtime(server: HttpServer): void {
    io = new Server(server, {
        cors: { origin: env.FRONTEND_URL, credentials: true }
    });

    // Auth is enforced at connect time only: the token is validated once during
    // the handshake, not re-checked for the socket's lifetime. That's safe here
    // because sockets only RECEIVE pushes scoped to the user's own room — every
    // data mutation still goes through per-request REST auth. A user soft-deleted
    // mid-session keeps receiving (non-sensitive) pushes until they reconnect.
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token as string | undefined;
            if (!token) return next(new Error('Authentication required'));

            const session = await auth.api.getSession({
                headers: new Headers({ authorization: `Bearer ${token}` })
            });
            if (!session) return next(new Error('Invalid session'));

            const fresh = await db.user.findUnique({
                where: { id: session.user.id },
                select: { deletedAt: true }
            });
            if (!fresh || fresh.deletedAt) return next(new Error('Account is no longer active'));

            socket.data.userId = session.user.id;
            next();
        } catch (err) {
            logger.warn({ err }, 'Socket handshake auth failed');
            next(new Error('Invalid session'));
        }
    });

    io.on('connection', socket => {
        socket.join(`user:${socket.data.userId as string}`);
    });

    logger.info('Realtime (Socket.IO) attached');
}

/** Fire-and-forget push to one user's open sockets. No-op before init / in tests. */
export function emitTicketEvent(userId: string, event: TicketEvent): void {
    io?.to(`user:${userId}`).emit(TICKET_EVENT, event);
}

/**
 * Closes Socket.IO AND the underlying http server (socket.io owns the close),
 * then invokes the callback. Falls through immediately when realtime never
 * initialized (e.g. unit tests importing app.ts).
 */
export function closeRealtime(onClosed: () => void): void {
    if (io) {
        void io.close(onClosed);
        io = null;
    } else {
        onClosed();
    }
}
