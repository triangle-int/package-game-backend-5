-- DropForeignKey
ALTER TABLE "Truck" DROP CONSTRAINT "Truck_startId_fkey";

-- AlterTable
ALTER TABLE "Truck" ALTER COLUMN "startId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_startId_fkey" FOREIGN KEY ("startId") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
