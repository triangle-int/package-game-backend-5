-- CreateTable
CREATE TABLE "Timeout" (
    "id" SERIAL NOT NULL,
    "eventName" TEXT NOT NULL,
    "params" TEXT NOT NULL,
    "executionTime" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timeout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interval" (
    "id" SERIAL NOT NULL,
    "eventName" TEXT NOT NULL,
    "params" TEXT NOT NULL,
    "cron" TEXT NOT NULL,

    CONSTRAINT "Interval_pkey" PRIMARY KEY ("id")
);
