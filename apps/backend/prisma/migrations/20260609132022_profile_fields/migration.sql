-- AlterTable
ALTER TABLE "user" ADD COLUMN     "bio" VARCHAR(280),
ADD COLUMN     "homeCity" VARCHAR(100),
ADD COLUMN     "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
