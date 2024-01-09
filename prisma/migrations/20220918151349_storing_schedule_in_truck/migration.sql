-- DropForeignKey
ALTER TABLE "Truck" DROP CONSTRAINT "Truck_buildingId_fkey";

-- AlterTable
ALTER TABLE "Truck" ADD COLUMN     "scheduleid" INTEGER;

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_scheduleid_fkey" FOREIGN KEY ("scheduleid") REFERENCES "TruckSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
