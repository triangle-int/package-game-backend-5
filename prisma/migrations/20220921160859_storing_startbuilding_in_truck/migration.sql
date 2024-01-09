/*
  Warnings:

  - You are about to drop the column `buildingId` on the `Truck` table. All the data in the column will be lost.
  - Added the required column `destinationId` to the `Truck` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startId` to the `Truck` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Truck" DROP CONSTRAINT "Truck_buildingId_fkey";

-- AlterTable
ALTER TABLE "Truck" DROP COLUMN "buildingId",
ADD COLUMN     "destinationId" INTEGER NOT NULL,
ADD COLUMN     "startId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_startId_fkey" FOREIGN KEY ("startId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
