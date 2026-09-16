import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import type { LookupAddress } from 'node:dns';
import { isBlockedAddress } from './url-safety.js';

const TIMEOUT_MS = 5000;
const CONCURRENCY = 8;

export type HeadResult = { status: number; contentType: string };

type Deps = {
    resolve: (hostname: string) => Promise<string[]>;
    /** Sends a HEAD to `url`, connecting ONLY to `address`. See pinnedHead. */
    head: (url: string, address: string) => Promise<HeadResult>;
};

/**
 * HEAD request whose TCP connection is pinned to an already-validated address.
 *
 * This is the whole point of the function. Resolving a hostname, checking the
 * address, and then handing the *hostname* to an HTTP client is a time-of-check /
 * time-of-use bug: the client resolves again, and an attacker serving a low-TTL
 * record can return a public address for our check and a private one for the real
 * connection (DNS rebinding). Passing our own `lookup` makes the socket connect to
 * the address we actually vetted.
 *
 * TLS still verifies against the hostname (SNI + certificate), so pinning the
 * address does not weaken transport security.
 *
 * Redirects are deliberately not followed — node:https does not follow them — so a
 * 3xx is reported as unreachable rather than silently chasing an unvetted host.
 */
function pinnedHead(url: string, address: string): Promise<HeadResult> {
    const target = new URL(url);
    if (target.protocol !== 'https:') {
        return Promise.reject(new Error('Only https is supported'));
    }

    return new Promise((resolve, reject) => {
        const req = httpsRequest(
            {
                protocol: target.protocol,
                hostname: target.hostname,
                port: target.port || 443,
                path: `${target.pathname}${target.search}`,
                method: 'HEAD',
                servername: target.hostname, // SNI — cert is still checked against the name
                timeout: TIMEOUT_MS,
                lookup: (_hostname, options, callback) => {
                    const family = address.includes(':') ? 6 : 4;
                    // Node calls this with `all: true` in some paths and expects an array.
                    if (typeof options === 'object' && options?.all) {
                        (callback as (e: null, a: LookupAddress[]) => void)(null, [{ address, family }]);
                    } else {
                        (callback as (e: null, a: string, f: number) => void)(null, address, family);
                    }
                }
            },
            response => {
                response.resume(); // drain so the socket can be released
                resolve({
                    status: response.statusCode ?? 0,
                    contentType: String(response.headers['content-type'] ?? '')
                });
            }
        );

        req.on('timeout', () => req.destroy(new Error('Timed out')));
        req.on('error', reject);
        req.end();
    });
}

const defaultDeps: Deps = {
    resolve: async hostname => (await lookup(hostname, { all: true })).map(r => r.address),
    head: pinnedHead
};

/**
 * Checks every unique URL is reachable and looks like an image.
 *
 * Runs before anything is written, so a dead link fails the import rather than
 * surfacing later in the detached Cloudinary migration where nobody is watching.
 * Returns a map of url → error message; an empty map means everything passed.
 */
export async function checkPhotoUrls(urls: string[], deps: Partial<Deps> = {}): Promise<Map<string, string>> {
    const { resolve, head } = { ...defaultDeps, ...deps };
    const unique = [...new Set(urls)];
    const failures = new Map<string, string>();

    const checkOne = async (url: string): Promise<void> => {
        const hostname = new URL(url).hostname;

        let addresses: string[];
        try {
            addresses = await resolve(hostname);
        } catch {
            failures.set(url, `Host ${hostname} could not be reached`);
            return;
        }
        // One private address is enough to make the fetch unsafe: we do not
        // control which address the HTTP client would otherwise pick.
        if (addresses.length === 0 || addresses.some(isBlockedAddress)) {
            failures.set(url, 'This host is not allowed');
            return;
        }

        // Connect to a vetted address, not to the name. `addresses[0]` is safe to
        // pick because the guard above requires EVERY resolved address to pass.
        const safeAddress = addresses[0] as string;

        try {
            const { status, contentType } = await head(url, safeAddress);
            if (status < 200 || status >= 300) {
                failures.set(url, `URL is unreachable (${status})`);
                return;
            }
            if (!contentType.startsWith('image/')) {
                failures.set(url, `URL is not an image (${contentType || 'no content-type'})`);
            }
        } catch {
            failures.set(url, 'URL is unreachable (timed out or refused)');
        }
    };

    for (let i = 0; i < unique.length; i += CONCURRENCY) {
        await Promise.all(unique.slice(i, i + CONCURRENCY).map(checkOne));
    }

    return failures;
}
