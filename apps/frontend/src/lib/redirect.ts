/** Where an unauthenticated visitor is sent, and how they get back afterwards.
 *
 *  Every logged-out visit routes through sign-in now that the app is gated, so
 *  the return-to path is a main flow rather than an edge case. Kept as pure
 *  functions: they are the part worth unit-testing, and the frontend has no DOM
 *  test environment. */

interface PathParts {
    pathname: string;
    search: string;
    hash: string;
}

/** Validate a `?redirect=` value before navigating to it.
 *
 *  Only same-origin absolute paths are allowed. `//host` is rejected because
 *  browsers treat it as protocol-relative — it would send the user off-site
 *  while still looking like a path. */
export function safeRedirect(raw: string | null | undefined, fallback = '/'): string {
    if (!raw) return fallback;
    if (!raw.startsWith('/')) return fallback;
    if (raw.startsWith('//')) return fallback;
    return raw;
}

/** Build the sign-in URL that remembers where the visitor was headed. */
export function buildSignInPath({ pathname, search, hash }: PathParts): string {
    const target = `${pathname}${search}${hash}`;
    // Nothing to remember: '/' is already the post-sign-in default for USERs.
    if (target === '/') return '/sign-in';
    return `/sign-in?redirect=${encodeURIComponent(target)}`;
}
