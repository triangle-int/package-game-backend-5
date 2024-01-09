-- CreateTable
CREATE TABLE "Trade" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "pricePerUnit" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
