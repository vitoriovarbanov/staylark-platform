import { describe, expect, test, vi } from 'vitest';
import { checkPhotoUrls } from './check-photo-urls.js';
import type { HeadResult } from './check-photo-urls.js';

const publicResolver = async () => ['93.184.216.34'];
const okHead = async (): Promise<HeadResult> => ({ status: 200, contentType: 'image/jpeg' });

describe('checkPhotoUrls', () => {
    test('accepts a reachable image', async () => {
        const result = await checkPhotoUrls(['https://a.com/1.jpg'], { resolve: publicResolver, head: okHead });
        expect(result.size).toBe(0);
    });

    test('rejects a url that resolves to a private address', async () => {
        const result = await checkPhotoUrls(['https://evil.com/1.jpg'], {
            resolve: async () => ['127.0.0.1'],
            head: okHead
        });
        expect(result.get('https://evil.com/1.jpg')).toMatch(/not allowed/i);
    });

    test('does not send a request to a url that failed the address check', async () => {
        const headSpy = vi.fn(okHead);
        await checkPhotoUrls(['https://evil.com/1.jpg'], {
            resolve: async () => ['169.254.169.254'],
            head: headSpy
        });
        expect(headSpy).not.toHaveBeenCalled();
    });

    test('rejects a 404', async () => {
        const result = await checkPhotoUrls(['https://a.com/missing.jpg'], {
            resolve: publicResolver,
            head: async () => ({ status: 404, contentType: '' })
        });
        expect(result.get('https://a.com/missing.jpg')).toMatch(/404/);
    });

    test('rejects a redirect instead of following it', async () => {
        const result = await checkPhotoUrls(['https://a.com/redir.jpg'], {
            resolve: publicResolver,
            head: async () => ({ status: 302, contentType: '' })
        });
        expect(result.get('https://a.com/redir.jpg')).toMatch(/302/);
    });

    test('rejects a non-image content type', async () => {
        const result = await checkPhotoUrls(['https://a.com/page.html'], {
            resolve: publicResolver,
            head: async () => ({ status: 200, contentType: 'text/html' })
        });
        expect(result.get('https://a.com/page.html')).toMatch(/not an image/i);
    });

    test('rejects an unresolvable host', async () => {
        const result = await checkPhotoUrls(['https://nope.invalid/1.jpg'], {
            resolve: async () => {
                throw new Error('ENOTFOUND');
            },
            head: okHead
        });
        expect(result.get('https://nope.invalid/1.jpg')).toMatch(/could not be reached/i);
    });

    test('checks each unique url only once', async () => {
        const headSpy = vi.fn(okHead);
        await checkPhotoUrls(['https://a.com/1.jpg', 'https://a.com/1.jpg'], {
            resolve: publicResolver,
            head: headSpy
        });
        expect(headSpy).toHaveBeenCalledTimes(1);
    });

    test('blocks when any resolved address is private', async () => {
        const result = await checkPhotoUrls(['https://rebind.com/1.jpg'], {
            resolve: async () => ['93.184.216.34', '10.0.0.1'],
            head: okHead
        });
        expect(result.get('https://rebind.com/1.jpg')).toMatch(/not allowed/i);
    });

    // ── DNS rebinding (TOCTOU) ───────────────────────────────────
    // The reason the request is pinned to an address rather than handed a hostname.
    // Resolving, vetting, then letting the HTTP client resolve AGAIN lets an attacker
    // with a low-TTL record answer public for the check and private for the connection.
    describe('is not vulnerable to DNS rebinding', () => {
        test('connects to the address that was vetted, not to the hostname', async () => {
            const headSpy = vi.fn(okHead);
            await checkPhotoUrls(['https://rebind.com/1.jpg'], { resolve: publicResolver, head: headSpy });

            expect(headSpy).toHaveBeenCalledWith('https://rebind.com/1.jpg', '93.184.216.34');
        });

        test('the vetted address is always one that passed the block list', async () => {
            const seen: string[] = [];
            await checkPhotoUrls(['https://a.com/1.jpg'], {
                resolve: async () => ['93.184.216.34', '1.1.1.1'],
                head: async (_url, address) => {
                    seen.push(address);
                    return okHead();
                }
            });
            expect(seen).toEqual(['93.184.216.34']);
        });
    });
});
