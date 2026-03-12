import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { CacheService } from '@iyknel/shared';
import { setCacheData, CacheKeyGenerators } from '../middleware/cache';
import CacheInvalidationService from '../utils/cacheInvalidation';

export async function setupCategoryRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient
): Promise<void> {
  const cacheService = CacheService.getInstance();

  /**
   * GET /categories
   * List all categories with caching (30 minutes - stable data)
   */
  fastify.get('/categories', async (request: FastifyRequest, reply: FastifyReply) => {
    const cacheKey = CacheKeyGenerators.categoriesList();

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
      const categories = await prisma.category.findMany({
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      });

      const response = {
        success: true,
        data: categories,
        count: categories.length,
      };

      // Cache categories (30 minutes - stable data)
      await setCacheData(cacheKey, response, 1800);

      return reply
        .header('X-Cache', 'MISS')
        .header('X-Cache-Key', cacheKey)
        .status(200)
        .send(response);
    } catch (error) {
      console.error('Error fetching categories:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch categories',
        statusCode: 500,
      });
    }
  });

  /**
   * GET /categories/:categoryId
   * Get single category with caching
   */
  fastify.get(
    '/categories/:categoryId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { categoryId } = request.params as { categoryId: string };
      const cacheKey = CacheKeyGenerators.category(categoryId);

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
        const category = await prisma.category.findUnique({
          where: { id: categoryId },
          include: {
            subcategories: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (!category) {
          return reply.status(404).send({
            success: false,
            error: 'Category not found',
            statusCode: 404,
          });
        }

        const response = {
          success: true,
          data: category,
        };

        // Cache category (30 minutes)
        await setCacheData(cacheKey, response, 1800);

        return reply
          .header('X-Cache', 'MISS')
          .header('X-Cache-Key', cacheKey)
          .status(200)
          .send(response);
      } catch (error) {
        console.error('Error fetching category:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch category',
          statusCode: 500,
        });
      }
    }
  );

  /**
   * GET /categories/:categoryId/subcategories
   * Get subcategories for a category with caching
   */
  fastify.get(
    '/categories/:categoryId/subcategories',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { categoryId } = request.params as { categoryId: string };
      const cacheKey = CacheKeyGenerators.subcategories(categoryId);

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
        const subcategories = await prisma.subCategory.findMany({
          where: { categoryId },
          select: {
            id: true,
            name: true,
          },
          orderBy: { name: 'asc' },
        });

        const response = {
          success: true,
          categoryId,
          data: subcategories,
          count: subcategories.length,
        };

        // Cache subcategories (30 minutes)
        await setCacheData(cacheKey, response, 1800);

        return reply
          .header('X-Cache', 'MISS')
          .header('X-Cache-Key', cacheKey)
          .status(200)
          .send(response);
      } catch (error) {
        console.error('Error fetching subcategories:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch subcategories',
          statusCode: 500,
        });
      }
    }
  );

  /**
   * GET /categories/:categoryId/products
   * Get products in a category with pagination and caching
   */
  fastify.get(
    '/categories/:categoryId/products',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { categoryId } = request.params as { categoryId: string };
      const page = Math.max(1, parseInt((request.query as any).page) || 1);
      const limit = Math.min(100, parseInt((request.query as any).limit) || 20);

      const cacheKey = CacheKeyGenerators.categoryProducts(categoryId, page, limit);

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
            where: { categoryId, isActive: true },
            skip,
            take: limit,
            select: {
              id: true,
              sku: true,
              name: true,
              description: true,
              basePrice: true,
              packSize: true,
              cartonQuantity: true,
              imageUrl: true,
            },
          }),
          prisma.product.count({ where: { categoryId, isActive: true } }),
        ]);

        const response = {
          success: true,
          categoryId,
          data: products,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        };

        // Cache category products (10 minutes)
        await setCacheData(cacheKey, response, 600);

        return reply
          .header('X-Cache', 'MISS')
          .header('X-Cache-Key', cacheKey)
          .status(200)
          .send(response);
      } catch (error) {
        console.error('Error fetching category products:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch products',
          statusCode: 500,
        });
      }
    }
  );

  /**
   * POST /categories (Admin only)
   * Create a new category
   */
  fastify.post('/categories', async (request: FastifyRequest, reply: FastifyReply) => {
    // TODO: Add authentication check for admin role

    try {
      const { name } = request.body as any;

      if (!name) {
        return reply.status(400).send({
          success: false,
          error: 'Category name is required',
          statusCode: 400,
        });
      }

      const category = await prisma.category.create({
        data: {
          name,
        },
      });

      // Invalidate categories list cache
      await CacheInvalidationService.invalidateCategory(category.id);

      return reply.status(201).send({
        success: true,
        data: category,
        message: 'Category created successfully',
      });
    } catch (error) {
      console.error('Error creating category:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to create category',
        statusCode: 500,
      });
    }
  });

  /**
   * PUT /categories/:categoryId (Admin only)
   * Update a category
   */
  fastify.put('/categories/:categoryId', async (request: FastifyRequest, reply: FastifyReply) => {
    // TODO: Add authentication check for admin role

    const { categoryId } = request.params as { categoryId: string };

    try {
      const updateData = request.body as any;

      const category = await prisma.category.update({
        where: { id: categoryId },
        data: updateData,
      });

      // Invalidate category cache
      await CacheInvalidationService.invalidateCategory(categoryId);

      return reply.status(200).send({
        success: true,
        data: category,
        message: 'Category updated successfully',
      });
    } catch (error) {
      console.error('Error updating category:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to update category',
        statusCode: 500,
      });
    }
  });
}
