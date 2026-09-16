// Which ticket's thread is on screen right now — lets the live-events hook
// suppress toasts for updates the user is already looking at. Module-level
// (not context) because only one modal can be open and only the socket hook reads it.
let activeTicketId: string | null = null;

export const setActiveTicketId = (id: string | null) => {
    activeTicketId = id;
};
export const getActiveTicketId = () => activeTicketId;
