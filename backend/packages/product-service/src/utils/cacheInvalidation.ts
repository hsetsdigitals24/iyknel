import { CacheService } from '@iyknel/shared';
import { CacheInvalidationPatterns } from '../middleware/cache';

export class CacheInvalidationService {
  private static cacheService = CacheService.getInstance();

  /**
   * Invalidate when a product is created, updated, or deleted
   */
  static async invalidateProduct(productId: string): Promise<void> {
    try {
      // Invalidate product-specific caches
      const keysDeleted = await this.cacheService.invalidatePattern(
        CacheInvalidationPatterns.product(productId)
      );

      // Also invalidate product list pagination (since product list changed)
      await this.cacheService.invalidatePattern(CacheInvalidationPatterns.productList());

      console.log(
        `[Cache Invalidation] Product ${productId}: invalidated ${keysDeleted} cache keys`
      );
    } catch (error) {
      console.error(`Error invalidating product ${productId}:`, error);
    }
  }

  /**
   * Invalidate when a product is added/removed to a category
   */
  static async invalidateCategory(categoryId: string): Promise<void> {
    try {
      // Invalidate category-specific caches
      const keysDeleted = await this.cacheService.invalidatePattern(
        CacheInvalidationPatterns.category(categoryId)
      );

      // Also invalidate categories list
      await this.cacheService.invalidatePattern(CacheInvalidationPatterns.categories());

      console.log(
        `[Cache Invalidation] Category ${categoryId}: invalidated ${keysDeleted} cache keys`
      );
    } catch (error) {
      console.error(`Error invalidating category ${categoryId}:`, error);
    }
  }

  /**
   * Invalidate when inventory/stock for a product changes
   * Uses shorter cache busting for inventory
   */
  static async invalidateProductAvailability(productId: string): Promise<void> {
    try {
      const keysDeleted = await this.cacheService.invalidatePattern(
        CacheInvalidationPatterns.product(productId) + ':availability*'
      );

      console.log(
        `[Cache Invalidation] Product ${productId} availability: invalidated ${keysDeleted} cache keys`
      );
    } catch (error) {
      console.error(`Error invalidating product availability ${productId}:`, error);
    }
  }

  /**
   * Invalidate when pricing rules change for a product
   */
  static async invalidateProductPricing(productId: string): Promise<void> {
    try {
      const keysDeleted = await this.cacheService.invalidatePattern(
        `pricing:${productId}*`
      );

      // Also invalidate the product itself since price is shown in list
      await this.cacheService.invalidatePattern(CacheInvalidationPatterns.productList());

      console.log(
        `[Cache Invalidation] Product ${productId} pricing: invalidated ${keysDeleted} cache keys`
      );
    } catch (error) {
      console.error(`Error invalidating product pricing ${productId}:`, error);
    }
  }

  /**
   * Bulk invalidate after product import/batch operations
   */
  static async invalidateProductList(): Promise<void> {
    try {
      const keysDeleted = await this.cacheService.invalidatePattern(
        CacheInvalidationPatterns.productList()
      );

      console.log(`[Cache Invalidation] Product list: invalidated ${keysDeleted} cache keys`);
    } catch (error) {
      console.error('Error invalidating product list:', error);
    }
  }

  /**
   * Clear all search-related caches
   */
  static async invalidateSearches(): Promise<void> {
    try {
      const keysDeleted = await this.cacheService.invalidatePattern(
        CacheInvalidationPatterns.searches()
      );

      console.log(`[Cache Invalidation] Searches: invalidated ${keysDeleted} cache keys`);
    } catch (error) {
      console.error('Error invalidating searches:', error);
    }
  }

  /**
   * Emergency: clear all product service caches
   */
  static async invalidateAll(): Promise<void> {
    try {
      const keysDeleted = await this.cacheService.invalidatePattern(
        CacheInvalidationPatterns.all()
      );

      console.log(
        `[Cache Invalidation] CLEAR ALL: invalidated ${keysDeleted} cache keys`
      );
    } catch (error) {
      console.error('Error clearing all caches:', error);
    }
  }
}

export default CacheInvalidationService;
