import { isIPv4 } from 'node:net';

/**
 * True when an IP address must never be fetched server-side.
 *
 * Photo URLs come from an uploaded spreadsheet, so they are attacker-controlled in
 * the threat model. Blocking by hostname is insufficient — a public name can
 * resolve to a private address — so callers must resolve DNS first and pass the
 * resolved address here.
 */
export function isBlockedAddress(address: string): boolean {
    if (isIPv4(address)) {
        const octets = address.split('.').map(Number);
        if (octets.some(n => Number.isNaN(n) || n < 0 || n > 255)) return true;
        const [a, b] = octets as [number, number, number, number];

        if (a === 0) return true; // unspecified / this network
        if (a === 127) return true; // loopback
        if (a === 10) return true; // private
        if (a === 172 && b >= 16 && b <= 31) return true; // private
        if (a === 192 && b === 168) return true; // private
        if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
        if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
        if (a >= 224) return true; // multicast + reserved
        return false;
    }

    // IPv6. Normalise then match the unsafe prefixes.
    const v6 = address.toLowerCase().split('%')[0] ?? '';
    if (v6 === '::' || v6 === '::1') return true; // unspecified, loopback
    if (v6.startsWith('fe80')) return true; // link-local
    if (/^f[cd]/.test(v6)) return true; // unique local (fc00::/7)
    if (v6.startsWith('::ffff:')) {
        // IPv4-mapped — judge the embedded address.
        return isBlockedAddress(v6.slice('::ffff:'.length));
    }
    return false;
}
