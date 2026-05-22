/*
  Warnings:

  - You are about to drop the column `quantity` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `pdfUrl` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `delta` on the `StockMovement` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CartItem" DROP COLUMN "quantity",
ADD COLUMN     "quantityCartons" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quantityPieces" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "pdfUrl",
ADD COLUMN     "pdfKey" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "quantityCartons" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quantityPieces" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unitsPerCartonSnap" INTEGER;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "stock",
ADD COLUMN     "stockCartons" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stockLoosePieces" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unitsPerCarton" INTEGER;

-- AlterTable
ALTER TABLE "StockMovement" DROP COLUMN "delta",
ADD COLUMN     "deltaCartons" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deltaPieces" INTEGER NOT NULL DEFAULT 0;
