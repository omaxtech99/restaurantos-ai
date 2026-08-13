-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pinHash" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "passwordHash" DROP NOT NULL;
