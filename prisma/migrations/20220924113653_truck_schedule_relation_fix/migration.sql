-- DropForeignKey
ALTER TABLE "Truck" DROP CONSTRAINT "Truck_scheduleId_fkey";

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "TruckSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
