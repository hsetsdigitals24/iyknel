-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "freeLogisticsThresholdKobo" INTEGER NOT NULL DEFAULT 20000000,
    "freeLogisticsBannerText" TEXT NOT NULL DEFAULT 'Free logistics on orders over {amount}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);
