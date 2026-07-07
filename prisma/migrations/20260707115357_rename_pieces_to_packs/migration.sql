-- Rename sub-carton unit columns from "pieces" to "packs" (data-preserving)
ALTER TABLE "Product" RENAME COLUMN "stockLoosePieces" TO "stockLoosePacks";
ALTER TABLE "CartItem" RENAME COLUMN "quantityPieces" TO "quantityPacks";
ALTER TABLE "OrderItem" RENAME COLUMN "quantityPieces" TO "quantityPacks";
ALTER TABLE "StockMovement" RENAME COLUMN "deltaPieces" TO "deltaPacks";
