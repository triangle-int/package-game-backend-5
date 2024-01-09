/*
  Warnings:

  - Added the required column `currentResource` to the `buildings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `resourceToUpgrade1` to the `buildings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `resourceToUpgrade2` to the `buildings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `resourceToUpgrade3` to the `buildings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "buildings" ADD COLUMN     "currentResource" TEXT NOT NULL,
ADD COLUMN     "resourceToUpgrade1" TEXT NOT NULL,
ADD COLUMN     "resourceToUpgrade2" TEXT NOT NULL,
ADD COLUMN     "resourceToUpgrade3" TEXT NOT NULL;
