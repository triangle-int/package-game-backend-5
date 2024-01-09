/*
  Warnings:

  - You are about to drop the column `scheduleid` on the `Truck` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Truck" DROP CONSTRAINT "Truck_scheduleid_fkey";

-- AlterTable
ALTER TABLE "Truck" DROP COLUMN "scheduleid",
ADD COLUMN     "scheduleId" INTEGER;

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "TruckSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
