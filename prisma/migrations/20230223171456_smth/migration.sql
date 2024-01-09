/*
  Warnings:

  - The primary key for the `Schedule` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[id]` on the table `Schedule` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Schedule_id_seq";

-- AlterTable
ALTER TABLE "buildings" ADD COLUMN     "turnoffDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_id_key" ON "Schedule"("id");
