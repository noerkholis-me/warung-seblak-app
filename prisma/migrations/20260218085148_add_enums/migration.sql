/*
  Warnings:

  - The `payment_method` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `payment_status` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `midtrans_status` column on the `payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `payment_method` on the `payments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('waiting', 'confirmed', 'preparing', 'served', 'completed');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'qris');

-- CreateEnum
CREATE TYPE "MidtransStatus" AS ENUM ('pending', 'settlement', 'expire', 'cancel', 'deny', 'failure');

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "payment_method",
ADD COLUMN     "payment_method" "PaymentMethod",
DROP COLUMN "payment_status",
ADD COLUMN     "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending',
DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'waiting';

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "payment_method",
ADD COLUMN     "payment_method" "PaymentMethod" NOT NULL,
DROP COLUMN "midtrans_status",
ADD COLUMN     "midtrans_status" "MidtransStatus";
