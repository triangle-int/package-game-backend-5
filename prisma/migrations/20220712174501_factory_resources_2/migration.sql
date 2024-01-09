-- AlterTable
ALTER TABLE "buildings" ALTER COLUMN "currentResource" DROP NOT NULL,
ALTER COLUMN "resourceToUpgrade1" DROP NOT NULL,
ALTER COLUMN "resourceToUpgrade2" DROP NOT NULL,
ALTER COLUMN "resourceToUpgrade3" DROP NOT NULL;
