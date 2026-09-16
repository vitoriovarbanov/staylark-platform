import { io, type Socket } from 'socket.io-client';

const TOKEN_KEY = 'better-auth.session_token';

let socket: Socket | null = null;

/**
 * Singleton Socket.IO connection. The bearer token goes in the handshake
 * `auth` payload (cookies are blocked cross-origin on staging — same reason
 * lib/api.ts sends a Bearer header). The callback form re-reads localStorage
 * on every (re)connect so a refreshed token is picked up automatically.
 */
export function connectSocket(): Socket {
    if (socket) return socket;
    socket = io(import.meta.env.VITE_API_URL, {
        withCredentials: true,
        auth: cb => cb({ token: localStorage.getItem(TOKEN_KEY) })
    });
    return socket;
}

export function disconnectSocket(): void {
    socket?.disconnect();
    socket = null;
}
