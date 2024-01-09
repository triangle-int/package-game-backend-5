-- CreateTable
CREATE TABLE "Booster" (
    "id" SERIAL NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Booster_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Booster" ADD CONSTRAINT "Booster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
