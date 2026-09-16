import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { adminMiddleware, managerMiddleware, staffMiddleware } from './auth.middleware.js';

function fakeRes() {
    const res = {
        statusCode: 0,
        body: undefined as unknown,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: unknown) {
            this.body = payload;
            return this;
        }
    };
    return res as unknown as Response & { statusCode: number; body: unknown };
}

const reqAs = (role?: string) => ({ user: role ? { role } : undefined }) as unknown as Request;

describe('managerMiddleware', () => {
    it('allows MANAGER', () => {
        const next = vi.fn();
        managerMiddleware(reqAs('MANAGER'), fakeRes(), next);
        expect(next).toHaveBeenCalledOnce();
    });

    it('rejects ADMIN — admins hold no operational access', () => {
        const res = fakeRes();
        const next = vi.fn();
        managerMiddleware(reqAs('ADMIN'), res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
    });

    it('rejects USER', () => {
        const res = fakeRes();
        const next = vi.fn();
        managerMiddleware(reqAs('USER'), res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
    });

    it('rejects an unauthenticated request', () => {
        const res = fakeRes();
        const next = vi.fn();
        managerMiddleware(reqAs(), res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
    });
});

describe('staffMiddleware', () => {
    // The roster endpoint both roles need. Admins lost operational access but must
    // still read the manager list for routing config and the successor picker.
    it('allows MANAGER', () => {
        const next = vi.fn();
        staffMiddleware(reqAs('MANAGER'), fakeRes(), next);
        expect(next).toHaveBeenCalledOnce();
    });

    it('allows ADMIN', () => {
        const next = vi.fn();
        staffMiddleware(reqAs('ADMIN'), fakeRes(), next);
        expect(next).toHaveBeenCalledOnce();
    });

    it('rejects USER', () => {
        const res = fakeRes();
        const next = vi.fn();
        staffMiddleware(reqAs('USER'), res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
    });

    it('rejects an unauthenticated request', () => {
        const res = fakeRes();
        const next = vi.fn();
        staffMiddleware(reqAs(), res, next);
        expect(res.statusCode).toBe(403);
    });
});

describe('adminMiddleware', () => {
    it('allows ADMIN', () => {
        const next = vi.fn();
        adminMiddleware(reqAs('ADMIN'), fakeRes(), next);
        expect(next).toHaveBeenCalledOnce();
    });

    it('rejects MANAGER', () => {
        const res = fakeRes();
        const next = vi.fn();
        adminMiddleware(reqAs('MANAGER'), res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
    });

    it('rejects an unauthenticated request', () => {
        const res = fakeRes();
        const next = vi.fn();
        adminMiddleware(reqAs(), res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.statusCode).toBe(403);
    });
});
