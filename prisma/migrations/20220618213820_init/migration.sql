-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "firebaseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nickname" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "geohash" TEXT NOT NULL,
    "money" INTEGER NOT NULL,
    "gems" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "experience" INTEGER NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discriminator" TEXT NOT NULL,
    "s2Token" TEXT NOT NULL,
    "geohash" TEXT NOT NULL,
    "level" INTEGER,
    "balance" INTEGER,
    "balanceUpdatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "ownerId" INTEGER,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_firebaseId_key" ON "users"("firebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "buildings_s2Token_key" ON "buildings"("s2Token");

-- CreateIndex
CREATE INDEX "buildings_geohash_idx" ON "buildings"("geohash");

-- AddForeignKey
ALTER TABLE "buildings" ADD CONSTRAINT "buildings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
