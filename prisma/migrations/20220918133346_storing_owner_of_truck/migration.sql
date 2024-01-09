/*
  Warnings:

  - Added the required column `ownerId` to the `Truck` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Truck" ADD COLUMN     "ownerId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
