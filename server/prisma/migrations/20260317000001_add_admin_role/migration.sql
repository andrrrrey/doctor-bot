-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('superadmin', 'doctor');

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN "role" "AdminRole" NOT NULL DEFAULT 'superadmin';
