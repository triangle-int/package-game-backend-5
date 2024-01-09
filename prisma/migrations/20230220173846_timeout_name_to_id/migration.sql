/*
  Warnings:

  - The primary key for the `Timeout` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `timeoutName` on the `Timeout` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Timeout" DROP CONSTRAINT "Timeout_pkey",
DROP COLUMN "timeoutName",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Timeout_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Timeout_id_seq";
