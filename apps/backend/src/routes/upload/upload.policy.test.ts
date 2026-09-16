import { describe, expect, test } from 'vitest';
import { canUploadToFolder } from './upload.policy.js';

describe('canUploadToFolder', () => {
    test('a regular USER can upload their own avatar', () => {
        expect(canUploadToFolder('USER', 'avatars')).toBe(true);
    });

    test('a regular USER cannot upload property imagery', () => {
        expect(canUploadToFolder('USER', 'properties')).toBe(false);
    });

    test('a MANAGER can upload both avatars and properties', () => {
        expect(canUploadToFolder('MANAGER', 'avatars')).toBe(true);
        expect(canUploadToFolder('MANAGER', 'properties')).toBe(true);
    });

    test('an ADMIN can upload their own avatar but not property imagery', () => {
        // Admins hold no operational role: they cannot create or edit a property,
        // so a signed URL for the properties folder would be an orphan upload.
        expect(canUploadToFolder('ADMIN', 'avatars')).toBe(true);
        expect(canUploadToFolder('ADMIN', 'properties')).toBe(false);
    });

    test('a missing role is denied for every folder', () => {
        expect(canUploadToFolder(undefined, 'avatars')).toBe(false);
        expect(canUploadToFolder(undefined, 'properties')).toBe(false);
    });
});
