-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "dietaryTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "nutritionInfo" JSONB,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "tasteProfile" JSONB,
ADD COLUMN     "videoUrl" TEXT;
