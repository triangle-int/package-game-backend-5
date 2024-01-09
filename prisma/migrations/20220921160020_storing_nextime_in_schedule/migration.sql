/*
  Warnings:

  - Added the required column `nextTime` to the `TruckSchedule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TruckSchedule" ADD COLUMN     "nextTime" TIMESTAMP(3) NOT NULL;
