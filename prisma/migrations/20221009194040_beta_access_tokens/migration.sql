-- CreateTable
CREATE TABLE "BetaAccessToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "BetaAccessToken_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BetaAccessToken" ADD CONSTRAINT "BetaAccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
