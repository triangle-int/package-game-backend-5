/*
  Warnings:

  - You are about to drop the column `balance` on the `buildings` table. All the data in the column will be lost.
  - You are about to drop the column `balanceUpdatedAt` on the `buildings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "buildings" DROP COLUMN "balance",
DROP COLUMN "balanceUpdatedAt",
ADD COLUMN     "inventoryUpdatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
