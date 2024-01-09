/*
  Warnings:

  - You are about to drop the column `comission` on the `buildings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "buildings" DROP COLUMN "comission",
ADD COLUMN     "commission" DOUBLE PRECISION;
