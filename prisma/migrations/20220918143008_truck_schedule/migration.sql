/*
  Warnings:

  - You are about to drop the column `destinationId` on the `Truck` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Truck" DROP COLUMN "destinationId",
ADD COLUMN     "buildingId" INTEGER;

-- CreateTable
CREATE TABLE "TruckSchedule" (
    "id" SERIAL NOT NULL,
    "interval" INTEGER NOT NULL,
    "truckType" INTEGER NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceCount" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "startId" INTEGER NOT NULL,
    "destinationId" INTEGER NOT NULL,

    CONSTRAINT "TruckSchedule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruckSchedule" ADD CONSTRAINT "TruckSchedule_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruckSchedule" ADD CONSTRAINT "TruckSchedule_startId_fkey" FOREIGN KEY ("startId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruckSchedule" ADD CONSTRAINT "TruckSchedule_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
