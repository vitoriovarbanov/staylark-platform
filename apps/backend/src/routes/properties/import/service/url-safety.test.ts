import { describe, expect, test } from 'vitest';
import { isBlockedAddress } from './url-safety.js';

describe('isBlockedAddress', () => {
    test.each([
        ['127.0.0.1', 'loopback'],
        ['127.1.2.3', 'loopback range'],
        ['0.0.0.0', 'unspecified'],
        ['10.1.2.3', 'private class A'],
        ['172.16.0.1', 'private class B lower bound'],
        ['172.31.255.254', 'private class B upper bound'],
        ['192.168.1.1', 'private class C'],
        ['169.254.169.254', 'link-local / cloud metadata'],
        ['100.64.0.1', 'carrier-grade NAT'],
        ['::1', 'IPv6 loopback'],
        ['fc00::1', 'IPv6 unique local'],
        ['fe80::1', 'IPv6 link-local']
    ])('blocks %s (%s)', address => {
        expect(isBlockedAddress(address)).toBe(true);
    });

    test.each([
        ['8.8.8.8'],
        ['1.1.1.1'],
        ['172.32.0.1'],
        ['172.15.255.254'],
        ['93.184.216.34'],
        ['2606:4700:4700::1111']
    ])('allows public address %s', address => {
        expect(isBlockedAddress(address)).toBe(false);
    });

    test('blocks an IPv4-mapped IPv6 loopback', () => {
        expect(isBlockedAddress('::ffff:127.0.0.1')).toBe(true);
    });
});
