import "server-only";
import { db } from "@/lib/db";
import { resolveImage } from "@/lib/r2";

export async function getOrCreateCart(userId: string) {
  return db.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

export type CartLine = {
  itemId: string;
  productId: string;
  name: string;
  slug: string;
  image: string | null;
  quantityCartons: number;
  quantityPieces: number;
  totalPieces: number;
  unitsPerCarton: number | null;
  unitPriceKobo: number;
  unitWeightGrams: number;
  lineSubtotalKobo: number;
  lineWeightGrams: number;
  stockCartons: number;
  stockLoosePieces: number;
};

export type CartSummary = {
  cartId: string;
  lines: CartLine[];
  subtotalKobo: number;
  weightGrams: number;
  itemCount: number; // total pieces across all lines
  cartonCount: number; // total cartons across all lines
};

export type Qty = { cartons: number; pieces: number };

export function totalPiecesFor(unitsPerCarton: number | null, qty: Qty): number {
  return qty.cartons * (unitsPerCarton ?? 0) + qty.pieces;
}

export async function getCartSummary(userId: string): Promise<CartSummary> {
  const cart = await getOrCreateCart(userId);
  const items = await db.cartItem.findMany({
    where: { cartId: cart.id },
    include: { product: true },
    orderBy: { id: "asc" },
  });
  const imageUrls = await Promise.all(
    items.map((i) => resolveImage(i.product.images[0])),
  );
  const lines: CartLine[] = items.map((i, idx) => {
    const upc = i.product.unitsPerCarton;
    const totalPieces = totalPiecesFor(upc, {
      cartons: i.quantityCartons,
      pieces: i.quantityPieces,
    });
    return {
      itemId: i.id,
      productId: i.product.id,
      name: i.product.name,
      slug: i.product.slug,
      image: imageUrls[idx],
      quantityCartons: i.quantityCartons,
      quantityPieces: i.quantityPieces,
      totalPieces,
      unitsPerCarton: upc,
      unitPriceKobo: i.product.priceKobo,
      unitWeightGrams: i.product.weightGrams,
      lineSubtotalKobo: i.product.priceKobo * totalPieces,
      lineWeightGrams: i.product.weightGrams * totalPieces,
      stockCartons: i.product.stockCartons,
      stockLoosePieces: i.product.stockLoosePieces,
    };
  });
  return {
    cartId: cart.id,
    lines,
    subtotalKobo: lines.reduce((s, l) => s + l.lineSubtotalKobo, 0),
    weightGrams: lines.reduce((s, l) => s + l.lineWeightGrams, 0),
    itemCount: lines.reduce((s, l) => s + l.totalPieces, 0),
    cartonCount: lines.reduce((s, l) => s + l.quantityCartons, 0),
  };
}

function validateAgainstProduct(
  product: { unitsPerCarton: number | null; stockCartons: number; stockLoosePieces: number; name: string },
  qty: Qty,
) {
  if (qty.cartons < 0 || qty.pieces < 0) {
    throw new Error("Quantities cannot be negative.");
  }
  if (qty.cartons > 0 && product.unitsPerCarton == null) {
    throw new Error(`${product.name} is sold by the piece only.`);
  }
  if (qty.cartons > product.stockCartons) {
    throw new Error(
      product.stockCartons === 0
        ? `${product.name}: no cartons in stock.`
        : `${product.name}: only ${product.stockCartons} carton${product.stockCartons === 1 ? "" : "s"} in stock.`,
    );
  }
  if (qty.pieces > product.stockLoosePieces) {
    const suggestion =
      product.unitsPerCarton != null
        ? ` Try buying by the carton (1 carton = ${product.unitsPerCarton} pcs).`
        : "";
    throw new Error(
      `${product.name}: only ${product.stockLoosePieces} loose piece${product.stockLoosePieces === 1 ? "" : "s"} in stock.${suggestion}`,
    );
  }
}

export async function addItem(userId: string, productId: string, qty: Qty) {
  if ((qty.cartons | 0) + (qty.pieces | 0) <= 0) {
    throw new Error("Pick at least one carton or piece.");
  }
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || !product.active) throw new Error("Product is unavailable.");

  const cart = await getOrCreateCart(userId);
  const existing = await db.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });
  const newCartons = (existing?.quantityCartons ?? 0) + qty.cartons;
  const newPieces = (existing?.quantityPieces ?? 0) + qty.pieces;
  validateAgainstProduct(product, { cartons: newCartons, pieces: newPieces });

  await db.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    update: { quantityCartons: newCartons, quantityPieces: newPieces },
    create: {
      cartId: cart.id,
      productId,
      quantityCartons: newCartons,
      quantityPieces: newPieces,
    },
  });
}

export async function updateItemQty(userId: string, itemId: string, qty: Qty) {
  const cart = await getOrCreateCart(userId);
  const item = await db.cartItem.findUnique({
    where: { id: itemId },
    include: { product: true },
  });
  if (!item || item.cartId !== cart.id) throw new Error("Cart item not found.");
  if ((qty.cartons | 0) <= 0 && (qty.pieces | 0) <= 0) {
    await db.cartItem.delete({ where: { id: itemId } });
    return;
  }
  validateAgainstProduct(item.product, qty);
  await db.cartItem.update({
    where: { id: itemId },
    data: { quantityCartons: qty.cartons, quantityPieces: qty.pieces },
  });
}

export async function removeItem(userId: string, itemId: string) {
  const cart = await getOrCreateCart(userId);
  await db.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
}

export async function clearCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  await db.cartItem.deleteMany({ where: { cartId: cart.id } });
}
