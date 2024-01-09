/*
  Warnings:

  - You are about to drop the column `s2Token` on the `buildings` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[geohex]` on the table `buildings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `geohex` to the `buildings` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "buildings_s2Token_key";

-- AlterTable
ALTER TABLE "buildings" DROP COLUMN "s2Token",
ADD COLUMN     "geohex" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "buildings_geohex_key" ON "buildings"("geohex");
