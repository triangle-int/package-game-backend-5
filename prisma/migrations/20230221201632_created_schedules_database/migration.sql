/*
  Warnings:

  - Made the column `serverId` on table `Timeout` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Timeout" ALTER COLUMN "serverId" SET NOT NULL;

-- CreateTable
CREATE TABLE "Schedule" (
    "id" SERIAL NOT NULL,
    "serverId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "params" TEXT NOT NULL,
    "nextExecutionTime" TIMESTAMP(3) NOT NULL,
    "interval" INTEGER NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);
