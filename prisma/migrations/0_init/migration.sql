-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "isReturning" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "total" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "itemsCount" INTEGER NOT NULL DEFAULT 0,
    "financialStatus" TEXT NOT NULL DEFAULT 'paid',
    "vendedor" TEXT,
    "unidade" TEXT,
    "formaPagamento" TEXT,
    "customerId" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "externalId" TEXT,
    "productId" TEXT,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttributionRecord" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "landingPage" TEXT,
    "referrer" TEXT,
    "channelGroup" TEXT NOT NULL,
    "firstTouch" TEXT,
    "lastTouch" TEXT,

    CONSTRAINT "AttributionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FunnelEvent" (
    "id" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "sessionId" TEXT,
    "stage" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'online',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,

    CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncCursor" (
    "id" TEXT NOT NULL,
    "sourceSystem" TEXT NOT NULL,
    "lastCursor" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'influencer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_sourceSystem_externalId_key" ON "Customer"("sourceSystem", "externalId");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_channel_idx" ON "Order"("channel");

-- CreateIndex
CREATE INDEX "Order_updatedAt_idx" ON "Order"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_sourceSystem_externalId_key" ON "Order"("sourceSystem", "externalId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "AttributionRecord_orderId_key" ON "AttributionRecord"("orderId");

-- CreateIndex
CREATE INDEX "AttributionRecord_channelGroup_idx" ON "AttributionRecord"("channelGroup");

-- CreateIndex
CREATE INDEX "AttributionRecord_utmCampaign_idx" ON "AttributionRecord"("utmCampaign");

-- CreateIndex
CREATE INDEX "FunnelEvent_occurredAt_idx" ON "FunnelEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "FunnelEvent_stage_idx" ON "FunnelEvent"("stage");

-- CreateIndex
CREATE INDEX "FunnelEvent_utmCampaign_idx" ON "FunnelEvent"("utmCampaign");

-- CreateIndex
CREATE UNIQUE INDEX "SyncCursor_sourceSystem_key" ON "SyncCursor"("sourceSystem");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_source_key" ON "Partner"("source");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributionRecord" ADD CONSTRAINT "AttributionRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

