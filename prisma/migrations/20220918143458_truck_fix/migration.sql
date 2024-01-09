/*
  Warnings:

  - Made the column `buildingId` on table `Truck` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Truck" DROP CONSTRAINT "Truck_buildingId_fkey";

-- AlterTable
ALTER TABLE "Truck" ALTER COLUMN "buildingId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
