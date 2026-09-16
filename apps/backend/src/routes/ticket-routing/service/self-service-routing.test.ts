import { describe, it, expect } from 'vitest';
import { assertSelfOnlyRoutingChange } from './self-service-routing.js';

const ME = 'mgr-me';
const OTHER = 'mgr-other';
const THIRD = 'mgr-third';

describe('assertSelfOnlyRoutingChange', () => {
    it('allows adding yourself', () => {
        expect(() => assertSelfOnlyRoutingChange([OTHER], [OTHER, ME], ME)).not.toThrow();
    });

    it('allows removing yourself', () => {
        expect(() => assertSelfOnlyRoutingChange([OTHER, ME], [OTHER], ME)).not.toThrow();
    });

    it('allows a no-op', () => {
        expect(() => assertSelfOnlyRoutingChange([OTHER], [OTHER], ME)).not.toThrow();
    });

    it('allows adding yourself to an empty category', () => {
        expect(() => assertSelfOnlyRoutingChange([], [ME], ME)).not.toThrow();
    });

    it('rejects adding someone else', () => {
        expect(() => assertSelfOnlyRoutingChange([ME], [ME, OTHER], ME)).toThrow(/only add or remove yourself/);
    });

    it('rejects removing someone else', () => {
        expect(() => assertSelfOnlyRoutingChange([ME, OTHER], [ME], ME)).toThrow(/only add or remove yourself/);
    });

    it('rejects wiping the whole category', () => {
        expect(() => assertSelfOnlyRoutingChange([OTHER, THIRD], [], ME)).toThrow(/only add or remove yourself/);
    });

    it('rejects an equal-length swap of someone else for yourself', () => {
        // The case a naive length check would let through.
        expect(() => assertSelfOnlyRoutingChange([OTHER], [ME], ME)).toThrow(/only add or remove yourself/);
    });

    it('rejects adding yourself while dropping another', () => {
        expect(() => assertSelfOnlyRoutingChange([OTHER, THIRD], [OTHER, ME], ME)).toThrow(
            /only add or remove yourself/
        );
    });

    it('ignores ordering and duplicates in the submitted list', () => {
        expect(() => assertSelfOnlyRoutingChange([OTHER, THIRD], [THIRD, OTHER, OTHER], ME)).not.toThrow();
    });
});
