/*
  Warnings:

  - Added the required column `lastPath` to the `TruckSchedule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TruckSchedule" ADD COLUMN     "lastPath" TEXT NOT NULL;
