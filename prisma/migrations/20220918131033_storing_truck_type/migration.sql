/*
  Warnings:

  - Added the required column `truckType` to the `Truck` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Truck" ADD COLUMN     "truckType" INTEGER NOT NULL;
