/*
  Warnings:

  - You are about to drop the column `banned` on the `Trade` table. All the data in the column will be lost.
  - Added the required column `banned` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Trade" DROP COLUMN "banned";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "banned" BOOLEAN NOT NULL;
