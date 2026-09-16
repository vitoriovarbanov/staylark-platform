import type { Request, Response, NextFunction } from 'express';
import type { AdminUpdateUser, AdminDeleteUser, UserListQuery } from '@staylark/contract';
import { usersService } from './service/users.service.js';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
}

export const usersController = {
    list: asyncHandler(async (req, res) => {
        const result = await usersService.list(req.query as unknown as UserListQuery);
        res.json(result);
    }),

    update: asyncHandler(async (req, res) => {
        const actor = req.user!;
        const data = await usersService.update(
            { id: actor.id, role: actor.role },
            req.params.id as string,
            req.body as AdminUpdateUser
        );
        res.json({ data });
    }),

    restore: asyncHandler(async (req, res) => {
        const actor = req.user!;
        await usersService.restore({ id: actor.id, role: actor.role }, req.params.id as string);
        res.status(204).send();
    }),

    listManagers: asyncHandler(async (_req, res) => {
        const data = await usersService.listManagers();
        res.json({ data });
    }),

    remove: asyncHandler(async (req, res) => {
        const actor = req.user!;
        const { successorManagerId } = (req.body ?? {}) as AdminDeleteUser;
        await usersService.softDelete(req.params.id as string, { id: actor.id, role: actor.role }, successorManagerId);
        res.status(204).send();
    })
};
