import type { Request, Response, NextFunction } from 'express';
import type { CreateInvitation, AcceptInvitation } from '@staylark/contract';
import { invitationsService } from './invitations.service.js';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
}

export const invitationsController = {
    // ── Admin ────────────────────────────────────────────────────
    list: asyncHandler(async (_req, res) => {
        res.json({ data: await invitationsService.list() });
    }),

    create: asyncHandler(async (req, res) => {
        const actor = { id: req.user!.id, name: req.user!.name, role: req.user!.role };
        res.status(201).json({ data: await invitationsService.create(actor, req.body as CreateInvitation) });
    }),

    resend: asyncHandler(async (req, res) => {
        const actor = { id: req.user!.id, name: req.user!.name, role: req.user!.role };
        res.json({ data: await invitationsService.resend(actor, req.params.id as string) });
    }),

    revoke: asyncHandler(async (req, res) => {
        const actor = { id: req.user!.id, name: req.user!.name, role: req.user!.role };
        await invitationsService.revoke(actor, req.params.id as string);
        res.status(204).send();
    }),

    // ── Public (token is the credential — no actor) ──────────────
    lookup: asyncHandler(async (req, res) => {
        res.json({ data: await invitationsService.lookup(req.params.token as string) });
    }),

    accept: asyncHandler(async (req, res) => {
        const authRes = await invitationsService.accept(req.params.token as string, req.body as AcceptInvitation);
        authRes.headers.getSetCookie().forEach(cookie => res.append('set-cookie', cookie));
        // Forward the auth session body too — it carries { token, user, ... } so the
        // SPA can persist the Bearer token where cookies are blocked.
        const body = await authRes.json().catch(() => ({}));
        res.status(200).json(body);
    })
};
