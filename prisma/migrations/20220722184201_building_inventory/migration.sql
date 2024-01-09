/*
  Warnings:

  - You are about to drop the column `ownerId` on the `InventoryItem` table. All the data in the column will be lost.
  - Added the required column `buildingId` to the `InventoryItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "InventoryItem" DROP CONSTRAINT "InventoryItem_ownerId_fkey";

-- AlterTable
ALTER TABLE "InventoryItem" DROP COLUMN "ownerId",
ADD COLUMN     "buildingId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
