import { FastifyReply, FastifyRequest } from 'fastify';
import { CacheService } from '@iyknel/shared';

export type CacheKeyGenerator = (req: FastifyRequest) => string;

export interface CacheOptions {
  ttl: number; // Time-to-live in seconds
  keyGenerator: CacheKeyGenerator;
}

/**
 * Cache middleware that intercepts GET requests and caches responses
 * @param req Fastify request
 * @param reply Fastify reply
 * @param options Cache options with TTL and key generator
 * @returns boolean - true if cache hit, false otherwise
 */
export async function cacheMiddleware(
  req: FastifyRequest,
  reply: FastifyReply,
  options: CacheOptions
): Promise<boolean> {
  // Skip caching if explicitly requested
  if (req.query?.['no-cache']) {
    return false;
  }

  const cacheService = CacheService.getInstance();

  // Check if cache service is healthy
  if (!cacheService.isHealthy()) {
    return false;
  }

  const cacheKey = options.keyGenerator(req);

  try {
    const cachedData = await cacheService.get(cacheKey);

    if (cachedData) {
      // Add cache hit header for debugging
      reply.header('X-Cache', 'HIT');
      reply.header('X-Cache-Key', cacheKey);
      return true; // Caller should send this as response
    }

    reply.header('X-Cache', 'MISS');
    reply.header('X-Cache-Key', cacheKey);
    return false;
  } catch (error) {
    console.error(`Cache middleware error for key ${cacheKey}:`, error);
    return false;
  }
}

/**
 * Helper to set cache data after response is generated
 */
export async function setCacheData<T>(
  key: string,
  data: T,
  ttl: number
): Promise<void> {
  const cacheService = CacheService.getInstance();

  if (cacheService.isHealthy()) {
    try {
      await cacheService.set(key, data, ttl);
    } catch (error) {
      console.error(`Error setting cache data for key ${key}:`, error);
    }
  }
}

/**
 * Key generator functions for common cache keys
 */
export const CacheKeyGenerators = {
  // Products cache keys
  productList: (page: number, limit: number) => `products:page:${page}:limit:${limit}`,
  product: (productId: string) => `product:${productId}`,
  productVariants: (productId: string) => `product:${productId}:variants`,
  productAvailability: (productId: string, warehouseId?: string) =>
    warehouseId
      ? `product:${productId}:availability:${warehouseId}`
      : `product:${productId}:availability`,

  // Search cache keys
  productSearch: (query: string) => `product:search:${query.toLowerCase()}`,
  skuSearch: (sku: string) => `sku:search:${sku.toLowerCase()}`,

  // Category cache keys
  categoriesList: () => 'categories:all',
  category: (categoryId: string) => `category:${categoryId}`,
  categoryProducts: (categoryId: string, page: number, limit: number) =>
    `category:${categoryId}:products:page:${page}:limit:${limit}`,
  subcategories: (categoryId: string) => `subcategories:${categoryId}`,

  // Pricing cache keys
  pricing: (productId: string, buyerCategory: string) =>
    `pricing:${productId}:${buyerCategory}`,

  // Inventory cache keys
  inventory: (productId: string, warehouseId: string) =>
    `inventory:${productId}:${warehouseId}`,
};

/**
 * Invalidation patterns for cache clearing
 */
export const CacheInvalidationPatterns = {
  // Invalidate all product caches when a product changes
  product: (productId: string) => `product:${productId}*`,

  // Invalidate category and its products when category changes
  category: (categoryId: string) => `category:${categoryId}*`,

  // Invalidate all product list caches
  productList: () => 'products:page:*',

  // Invalidate all search caches
  searches: () => 'product:search:*',

  // Invalidate all category caches
  categories: () => 'categories:*',

  // Complete cache clear (use with caution)
  all: () => '*',
};
