import type { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        emailVerified: boolean;
        image?: string | null;
        role: UserRole;
        createdAt: Date;
        updatedAt: Date;
      };
      session?: {
        id: string;
        expiresAt: Date;
        token: string;
        ipAddress?: string | null;
        userAgent?: string | null;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
      };
    }
  }
}

export {};
