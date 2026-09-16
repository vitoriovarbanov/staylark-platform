import type { UserRole } from '@prisma/client';
import type { UploadSignatureRequest } from '@staylark/contract';

type UploadFolder = UploadSignatureRequest['folder'];

/**
 * Which roles may request an upload signature for each logical folder.
 * Keep this in sync with the folder enum in @staylark/contract.
 *
 * An explicit allowlist rather than a role ladder: ADMIN no longer outranks
 * MANAGER for operational work, so a "minimum role" model would keep handing
 * admins signed URLs for property imagery they can never attach to anything.
 * Avatars stay self-service for any signed-in user.
 */
const FOLDER_ROLES: Record<UploadFolder, UserRole[]> = {
    avatars: ['USER', 'MANAGER', 'ADMIN'],
    properties: ['MANAGER']
};

/** Whether a user with `role` may request an upload signature for `folder`. */
export function canUploadToFolder(role: UserRole | undefined, folder: UploadFolder): boolean {
    if (!role) return false;
    return FOLDER_ROLES[folder]?.includes(role) ?? false;
}
