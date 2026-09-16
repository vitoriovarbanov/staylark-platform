import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Menu, Skeleton, Textarea } from '@mantine/core';
import { IconChevronDown, IconMessageOff, IconSend, IconSparkles } from '@tabler/icons-react';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import { TICKET_REPLY_LANGUAGES, type Ticket, type TicketReplyLanguage } from '@staylark/contract';
import {
    useTicketMessages,
    useSendTicketMessage,
    useMarkTicketSeen,
    useSuggestReply
} from '@/hooks/api/use-ticket-messages';
import { useAuth } from '@/contexts/auth-context';
import classes from './TicketThread.module.css';

export function TicketThread({ ticket, footerLeft }: { ticket: Ticket; footerLeft?: ReactNode }) {
    const { user } = useAuth();
    const messagesQuery = useTicketMessages(ticket.id);
    const sendMutation = useSendTicketMessage();
    const markSeen = useMarkTicketSeen();
    const suggestMutation = useSuggestReply();
    const [body, setBody] = useState('');
    const messagesRef = useRef<HTMLDivElement>(null);

    const messages = messagesQuery.data?.data ?? [];
    const isReporter = user?.id === ticket.userId;

    // Stamp "seen" only when the reporter has the thread on screen and there
    // is something unread — a live push that increments unread (length grows)
    // re-runs this so the badge still clears. markSeen invalidates lists()
    // only; `ticket` comes from the detail query, so unreadMessageCount is
    // stable within this render and the effect can't loop.
    useEffect(() => {
        if (isReporter && ticket.unreadMessageCount > 0) markSeen.mutate(ticket.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReporter, ticket.id, ticket.unreadMessageCount, messages.length]);

    // Keep the newest message visible after a send or live push.
    useEffect(() => {
        const el = messagesRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages.length]);

    const handleSend = () => {
        const trimmed = body.trim();
        if (!trimmed) return;
        sendMutation.mutate({ ticketId: ticket.id, body: trimmed }, { onSuccess: () => setBody('') });
    };

    const handleSuggest = (language?: TicketReplyLanguage) => {
        suggestMutation.mutate(
            { ticketId: ticket.id, language },
            {
                onSuccess: res => setBody(res.data.suggestion),
                onError: () =>
                    notifications.show({
                        title: 'Couldn’t generate a suggestion',
                        message: 'Please try again, or write a reply yourself.',
                        color: 'red'
                    })
            }
        );
    };

    return (
        <section className={classes.thread}>
            <span className={classes.sectionLabel}>Conversation</span>

            {messagesQuery.isLoading && <Skeleton height={60} radius='sm' />}

            {!messagesQuery.isLoading && messages.length === 0 && (
                <EmptyState variant='compact' icon={IconMessageOff} title='No replies yet' />
            )}

            <div ref={messagesRef} className={classes.messages}>
                {messages.map(m => {
                    const isOwn = m.authorId === user?.id;
                    const isStaffMsg = m.authorId !== ticket.userId;
                    return (
                        <div
                            key={m.id}
                            className={classes.bubble}
                            data-own={isOwn || undefined}
                            data-staff={isStaffMsg || undefined}
                        >
                            <div className={classes.bubbleMeta}>
                                <span className={classes.bubbleAuthor}>
                                    {isOwn ? 'You' : m.authorName}
                                    {isStaffMsg && !isOwn ? ' · Staff' : ''}
                                </span>
                                <span>{dayjs(m.createdAt).format('D MMM · HH:mm')}</span>
                            </div>
                            <p className={classes.bubbleBody}>{m.body}</p>
                        </div>
                    );
                })}
            </div>

            <div className={classes.composer}>
                <Textarea
                    aria-label='Write a reply'
                    placeholder='Write a reply…'
                    value={body}
                    onChange={e => setBody(e.currentTarget.value)}
                    autosize
                    minRows={2}
                    maxRows={6}
                    maxLength={2000}
                />
                <div className={classes.composerActions}>
                    {footerLeft && <div className={classes.composerLeft}>{footerLeft}</div>}
                    {!isReporter && (
                        <Menu shadow='md' position='top-start' withinPortal>
                            <Menu.Target>
                                <Button
                                    className={classes.suggestButton}
                                    variant='light'
                                    loading={suggestMutation.isPending}
                                    leftSection={<IconSparkles size={16} />}
                                    rightSection={<IconChevronDown size={14} />}
                                >
                                    Suggest reply
                                </Button>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Label>Reply language</Menu.Label>
                                <Menu.Item onClick={() => handleSuggest()}>Auto-detect</Menu.Item>
                                {TICKET_REPLY_LANGUAGES.map(language => (
                                    <Menu.Item key={language} onClick={() => handleSuggest(language)}>
                                        {language}
                                    </Menu.Item>
                                ))}
                            </Menu.Dropdown>
                        </Menu>
                    )}
                    <Button
                        onClick={handleSend}
                        loading={sendMutation.isPending}
                        disabled={!body.trim()}
                        leftSection={<IconSend size={16} />}
                    >
                        Send
                    </Button>
                </div>
            </div>
        </section>
    );
}
