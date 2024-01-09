/*
  Warnings:

  - Added the required column `timeoutName` to the `Timeout` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Timeout" ADD COLUMN     "timeoutName" TEXT NOT NULL;
