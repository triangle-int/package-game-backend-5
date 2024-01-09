/*
  Warnings:

  - You are about to alter the column `resourceCount` on the `TruckSchedule` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterTable
ALTER TABLE "TruckSchedule" ALTER COLUMN "resourceCount" SET DATA TYPE INTEGER;
