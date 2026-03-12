import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { CacheService } from '@iyknel/shared';
import { 
  setCacheData,
  CacheKeyGenerators, 
} from '../middleware/cache';
import CacheInvalidationService from '../utils/cacheInvalidation';

export async function setupProductRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient
): Promise<void> {
  const cacheService = CacheService.getInstance();

  /**
   * GET /products
   * List all products with pagination and caching
   * Query params: page=1, limit=20
   */
  fastify.get('/products', async (request: FastifyRequest, reply: FastifyReply) => {
    const page = Math.max(1, parseInt((request.query as any).page) || 1);
    const limit = Math.min(100, parseInt((request.query as any).limit) || 20);

    const cacheKey = CacheKeyGenerators.productList(page, limit);

    // Check cache
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      return reply
        .header('X-Cache', 'HIT')
        .header('X-Cache-Key', cacheKey)
        .status(200)
        .send(cachedData);
    }

    try {
      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          skip,
          take: limit,
          where: { isActive: true },
          select: {
            id: true,
            sku: true,
            name: true,
            description: true,
            categoryId: true,
            basePrice: true,
            packSize: true,
            cartonQuantity: true,
            minOrderQty: true,
            imageUrl: true,
            createdAt: true,
          },
        }),
        prisma.product.count({ where: { isActive: true } }),
      ]);

      const response = {
        success: true,
        data: products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };

      // Cache the response (10 minutes)
      await setCacheData(cacheKey, response, 600);

      return reply
        .header('X-Cache', 'MISS')
        .header('X-Cache-Key', cacheKey)
        .status(200)
        .send(response);
    } catch (error) {
      console.error('Error fetching products:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch products',
        statusCode: 500,
      });
    }
  });

  /**
   * GET /products/:productId
   * Get single product by ID with caching
   */
  fastify.get('/products/:productId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { productId } = request.params as { productId: string };
    const cacheKey = CacheKeyGenerators.product(productId);

    // Check cache
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      return reply
        .header('X-Cache', 'HIT')
        .header('X-Cache-Key', cacheKey)
        .status(200)
        .send(cachedData);
    }

    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          subcategory: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!product) {
        return reply.status(404).send({
          success: false,
          error: 'Product not found',
          statusCode: 404,
        });
      }

      const response = {
        success: true,
        data: product,
      };

      // Cache the response (15 minutes)
      await setCacheData(cacheKey, response, 900);

      return reply
        .header('X-Cache', 'MISS')
        .header('X-Cache-Key', cacheKey)
        .status(200)
        .send(response);
    } catch (error) {
      console.error('Error fetching product:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch product',
        statusCode: 500,
      });
    }
  });

  /**
   * GET /products/search
   * Search products by SKU or name with caching
   * Query params: query=xxx, type (sku|name)
   */
  fastify.get('/search', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.query as any).q || '';
    const type = (request.query as any).type || 'all'; // sku, name, or all
    const limit = Math.min(50, parseInt((request.query as any).limit) || 20);

    if (!query || query.trim().length < 2) {
      return reply.status(400).send({
        success: false,
        error: 'Query must be at least 2 characters',
        statusCode: 400,
      });
    }

    const cacheKey = CacheKeyGenerators.productSearch(query);

    // Check cache
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      return reply
        .header('X-Cache', 'HIT')
        .header('X-Cache-Key', cacheKey)
        .status(200)
        .send(cachedData);
    }

    try {
      let products;

      if (type === 'sku') {
        products = await prisma.product.findMany({
          where: {
            sku: { contains: query, mode: 'insensitive' },
            isActive: true,
          },
          take: limit,
          select: {
            id: true,
            sku: true,
            name: true,
            basePrice: true,
            categoryId: true,
          },
        });
      } else if (type === 'name') {
        products = await prisma.product.findMany({
          where: {
            name: { contains: query, mode: 'insensitive' },
            isActive: true,
          },
          take: limit,
          select: {
            id: true,
            sku: true,
            name: true,
            basePrice: true,
            categoryId: true,
          },
        });
      } else {
        // Search both
        products = await prisma.product.findMany({
          where: {
            OR: [
              { sku: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
            ],
            isActive: true,
          },
          take: limit,
          select: {
            id: true,
            sku: true,
            name: true,
            basePrice: true,
            categoryId: true,
          },
        });
      }

      const response = {
        success: true,
        query,
        results: products,
        count: products.length,
      };

      // Cache search results (5 minutes)
      await setCacheData(cacheKey, response, 300);

      return reply
        .header('X-Cache', 'MISS')
        .header('X-Cache-Key', cacheKey)
        .status(200)
        .send(response);
    } catch (error) {
      console.error('Error searching products:', error);
      return reply.status(500).send({
        success: false,
        error: 'Search failed',
        statusCode: 500,
      });
    }
  });

  /**
   * GET /products/:productId/variants
   * Get product variants with caching
   */
  fastify.get(
    '/products/:productId/variants',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { productId } = request.params as { productId: string };
      const cacheKey = CacheKeyGenerators.productVariants(productId);

      // Check cache
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        return reply
          .header('X-Cache', 'HIT')
          .header('X-Cache-Key', cacheKey)
          .status(200)
          .send(cachedData);
      }

      try {
        const variants = await prisma.productVariant.findMany({
          where: { productId },
          select: {
            id: true,
            name: true,
            value: true,
            priceModifier: true,
          },
        });

        const response = {
          success: true,
          productId,
          variants,
          count: variants.length,
        };

        // Cache variants (15 minutes)
        await setCacheData(cacheKey, response, 900);

        return reply
          .header('X-Cache', 'MISS')
          .header('X-Cache-Key', cacheKey)
          .status(200)
          .send(response);
      } catch (error) {
        console.error('Error fetching variants:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch variants',
          statusCode: 500,
        });
      }
    }
  );

  /**
   * POST /products (Admin only - creates product)
   * Invalidates cache after creation
   */
  fastify.post('/products', async (request: FastifyRequest, reply: FastifyReply) => {
    // TODO: Add authentication check for admin role

    try {
      const {
        sku,
        name,
        description,
        categoryId,
        subcategoryId,
        basePrice,
        packSize,
        cartonQuantity,
        minOrderQty,
        imageUrl,
      } = request.body as any;

      // Validate required fields
      if (!sku || !name || !categoryId || !basePrice) {
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: sku, name, categoryId, basePrice',
          statusCode: 400,
        });
      }

      const product = await prisma.product.create({
        data: {
          sku,
          name,
          description,
          categoryId,
          subcategoryId,
          basePrice,
          packSize: packSize || 1,
          cartonQuantity: cartonQuantity || 12,
          minOrderQty: minOrderQty || 1,
          imageUrl,
        },
      });

      // Invalidate product list cache
      await CacheInvalidationService.invalidateProductList();
      await CacheInvalidationService.invalidateCategory(categoryId);

      return reply.status(201).send({
        success: true,
        data: product,
        message: 'Product created successfully',
      });
    } catch (error: any) {
      console.error('Error creating product:', error);
      
      // Handle Prisma-specific errors
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        return reply.status(400).send({
          success: false,
          error: `A product with this ${field} already exists`,
          statusCode: 400,
        });
      }
      
      if (error.code === 'P2003') {
        return reply.status(400).send({
          success: false,
          error: 'Invalid categoryId or subcategoryId - does not exist',
          statusCode: 400,
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Failed to create product',
        statusCode: 500,
      });
    }
  });

  /**
   * PUT /products/:productId (Admin only - updates product)
   * Invalidates cache after update
   */
  fastify.put('/products/:productId', async (request: FastifyRequest, reply: FastifyReply) => {
    // TODO: Add authentication check for admin role

    const { productId } = request.params as { productId: string };

    try {
      const updateData = request.body as any;

      const product = await prisma.product.update({
        where: { id: productId },
        data: updateData,
      });

      // Invalidate product cache and related caches
      await CacheInvalidationService.invalidateProduct(productId);
      if (updateData.categoryId) {
        await CacheInvalidationService.invalidateCategory(updateData.categoryId);
      }
      if (updateData.basePrice) {
        await CacheInvalidationService.invalidateProductPricing(productId);
      }

      return reply.status(200).send({
        success: true,
        data: product,
        message: 'Product updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating product:', error);
      
      // Handle Prisma-specific errors
      if (error.code === 'P2025') {
        return reply.status(404).send({
          success: false,
          error: 'Product not found',
          statusCode: 404,
        });
      }
      
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        return reply.status(400).send({
          success: false,
          error: `A product with this ${field} already exists`,
          statusCode: 400,
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Failed to update product',
        statusCode: 500,
      });
    }
  });

  /**
   * DELETE /products/:productId (Admin only - soft delete)
   */
  fastify.delete('/products/:productId', async (request: FastifyRequest, reply: FastifyReply) => {
    // TODO: Add authentication check for admin role

    const { productId } = request.params as { productId: string };

    try {
      await prisma.product.update({
        where: { id: productId },
        data: { isActive: false },
      });

      // Invalidate product cache
      await CacheInvalidationService.invalidateProduct(productId);

      return reply.status(200).send({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting product:', error);
      
      // Handle Prisma-specific errors
      if (error.code === 'P2025') {
        return reply.status(404).send({
          success: false,
          error: 'Product not found',
          statusCode: 404,
        });
      }

      return reply.status(500).send({
        success: false,
        error: 'Failed to delete product',
        statusCode: 500,
      });
    }
  });
}
