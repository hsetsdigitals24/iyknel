import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { CacheService } from '@iyknel/shared';
import { setCacheData, CacheKeyGenerators } from '../middleware/cache';

export async function setupAvailabilityRoutes(
  fastify: FastifyInstance,
  prisma: PrismaClient
): Promise<void> {
  const cacheService = CacheService.getInstance();

  /**
   * GET /products/:productId/availability
   * Get product availability/stock levels with short caching (1-2 min for accuracy)
   * Query params: warehouseId (optional - if not provided, returns all warehouses)
   */
  fastify.get(
    '/products/:productId/availability',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { productId } = request.params as { productId: string };
      const { warehouseId } = request.query as any;

      const cacheKey = CacheKeyGenerators.productAvailability(productId, warehouseId);

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
        // Verify product exists
        const product = await prisma.product.findUnique({
          where: { id: productId },
          select: { id: true, sku: true, name: true },
        });

        if (!product) {
          return reply.status(404).send({
            success: false,
            error: 'Product not found',
            statusCode: 404,
          });
        }

        let inventoryLevels;

        if (warehouseId) {
          // Get specific warehouse inventory
          inventoryLevels = await prisma.inventoryLevel.findMany({
            where: {
              productId,
              warehouseId,
            },
            select: {
              id: true,
              warehouseId: true,
              availableQuantity: true,
              reservedQuantity: true,
              reorderLevel: true,
              warehouse: {
                select: {
                  id: true,
                  name: true,
                  location: true,
                },
              },
            },
          });
        } else {
          // Get all warehouses
          inventoryLevels = await prisma.inventoryLevel.findMany({
            where: { productId },
            select: {
              id: true,
              warehouseId: true,
              availableQuantity: true,
              reservedQuantity: true,
              reorderLevel: true,
              warehouse: {
                select: {
                  id: true,
                  name: true,
                  location: true,
                },
              },
            },
          });
        }

        // Calculate totals
        const totalAvailable = inventoryLevels.reduce(
          (sum, inv) => sum + inv.availableQuantity,
          0
        );
        const totalReserved = inventoryLevels.reduce((sum, inv) => sum + inv.reservedQuantity, 0);

        const response = {
          success: true,
          product: {
            id: product.id,
            sku: product.sku,
            name: product.name,
          },
          inventory: inventoryLevels.map((inv) => ({
            warehouse: inv.warehouse,
            available: inv.availableQuantity,
            reserved: inv.reservedQuantity,
            reorderLevel: inv.reorderLevel,
            isLowStock: inv.availableQuantity <= inv.reorderLevel,
          })),
          totals: {
            available: totalAvailable,
            reserved: totalReserved,
            total: totalAvailable + totalReserved,
          },
          isOutOfStock: totalAvailable === 0,
        };

        // Cache availability (2 minutes - short TTL for stock accuracy)
        await setCacheData(cacheKey, response, 120);

        return reply
          .header('X-Cache', 'MISS')
          .header('X-Cache-Key', cacheKey)
          .status(200)
          .send(response);
      } catch (error) {
        console.error('Error fetching availability:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch availability',
          statusCode: 500,
        });
      }
    }
  );

  /**
   * GET /products/:productId/low-stock
   * Check if product is low on stock (helper endpoint)
   */
  fastify.get(
    '/products/:productId/low-stock',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { productId } = request.params as { productId: string };

      try {
        const lowStockItems = await prisma.inventoryLevel.findMany({
          where: {
            productId,
            availableQuantity: {
              lte: prisma.inventoryLevel.fields.reorderLevel,
            },
          },
          select: {
            warehouse: {
              select: {
                id: true,
                name: true,
              },
            },
            availableQuantity: true,
            reorderLevel: true,
          },
        });

        return reply.status(200).send({
          success: true,
          productId,
          lowStockWarehouses: lowStockItems,
          hasLowStock: lowStockItems.length > 0,
        });
      } catch (error) {
        console.error('Error checking low stock:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to check stock status',
          statusCode: 500,
        });
      }
    }
  );

  /**
   * GET /warehouses
   * List all warehouses with inventory summary
   */
  fastify.get('/warehouses', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const warehouses = await prisma.warehouse.findMany({
        where: { isActive: true },
        include: {
          inventoryLevels: {
            select: {
              availableQuantity: true,
              reservedQuantity: true,
            },
          },
        },
      });

      const warehouseSummary = warehouses.map((warehouse) => {
        const totalAvailable = warehouse.inventoryLevels.reduce(
          (sum, inv) => sum + inv.availableQuantity,
          0
        );
        const totalReserved = warehouse.inventoryLevels.reduce(
          (sum, inv) => sum + inv.reservedQuantity,
          0
        );

        return {
          id: warehouse.id,
          name: warehouse.name,
          location: warehouse.location,
          totalAvailable,
          totalReserved,
          total: totalAvailable + totalReserved,
          productCount: warehouse.inventoryLevels.length,
        };
      });

      return reply.status(200).send({
        success: true,
        data: warehouseSummary,
        count: warehouseSummary.length,
      });
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch warehouses',
        statusCode: 500,
      });
    }
  });

  /**
   * GET /warehouses/:warehouseId
   * Get warehouse details with inventory
   */
  fastify.get(
    '/warehouses/:warehouseId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { warehouseId } = request.params as { warehouseId: string };

      try {
        const warehouse = await prisma.warehouse.findUnique({
          where: { id: warehouseId },
          include: {
            inventoryLevels: {
              select: {
                product: {
                  select: {
                    id: true,
                    sku: true,
                    name: true,
                  },
                },
                availableQuantity: true,
                reservedQuantity: true,
                reorderLevel: true,
              },
            },
          },
        });

        if (!warehouse) {
          return reply.status(404).send({
            success: false,
            error: 'Warehouse not found',
            statusCode: 404,
          });
        }

        const totalAvailable = warehouse.inventoryLevels.reduce(
          (sum, inv) => sum + inv.availableQuantity,
          0
        );

        const response = {
          success: true,
          data: {
            id: warehouse.id,
            name: warehouse.name,
            location: warehouse.location,
            inventory: warehouse.inventoryLevels,
            totals: {
              available: totalAvailable,
              productCount: warehouse.inventoryLevels.length,
            },
          },
        };

        return reply.status(200).send(response);
      } catch (error) {
        console.error('Error fetching warehouse:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch warehouse',
          statusCode: 500,
        });
      }
    }
  );
}
