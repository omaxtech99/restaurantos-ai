-- CreateEnum
CREATE TYPE "OrderPaymentMethod" AS ENUM ('cash', 'online');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paymentMethod" "OrderPaymentMethod",
ADD COLUMN     "razorpayOrderId" TEXT,
ADD COLUMN     "razorpayPaymentId" TEXT,
ADD COLUMN     "tipCents" INTEGER NOT NULL DEFAULT 0;
