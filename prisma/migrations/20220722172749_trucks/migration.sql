-- CreateTable
CREATE TABLE "Truck" (
    "id" SERIAL NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "path" TEXT NOT NULL,
    "destinationId" INTEGER NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceCount" INTEGER NOT NULL,

    CONSTRAINT "Truck_pkey" PRIMARY KEY ("id")
);
