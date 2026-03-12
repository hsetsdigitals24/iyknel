import fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import { CacheService } from '@iyknel/shared';
import { setupProductRoutes } from './routes/products';
import { setupCategoryRoutes } from './routes/categories';
import { setupAvailabilityRoutes } from './routes/availability';

const app = fastify({ logger: true });
const prisma = new PrismaClient();
const cacheService = CacheService.getInstance();

app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
});

// Health check
app.get('/health', async (request, reply) => {
  const cacheHealthy = cacheService.isHealthy();
  return {
    status: 'ok',
    service: 'product-service',
    cache: cacheHealthy ? 'connected' : 'disconnected',
  };
});

// Health check (via API gateway)
app.get('/api/products/health', async (request, reply) => {
  const cacheHealthy = cacheService.isHealthy();
  return {
    status: 'ok',
    service: 'product-service',
    cache: cacheHealthy ? 'connected' : 'disconnected',
  };
});

// Admin - cache management endpoints
app.delete('/admin/cache/clear', async (request, reply) => {
  // TODO: Add authentication check for admin role
  try {
    await cacheService.clear();
    return { success: true, message: 'All caches cleared' };
  } catch (error) {
    return reply.status(500).send({
      success: false,
      error: 'Failed to clear cache',
    });
  }
});

app.delete('/admin/cache/:pattern', async (request, reply) => {
  // TODO: Add authentication check for admin role
  const { pattern } = request.params as { pattern: string };

  try {
    const keysDeleted = await cacheService.invalidatePattern(pattern);
    return {
      success: true,
      pattern,
      keysDeleted,
    };
  } catch (error) {
    return reply.status(500).send({
      success: false,
      error: 'Failed to invalidate cache pattern',
    });
  }
});

const start = async () => {
  try {
    // Initialize cache service
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    await cacheService.initialize(redisUrl);

    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connection successful');

    // Register routes
    await setupProductRoutes(app, prisma);
    await setupCategoryRoutes(app, prisma);
    await setupAvailabilityRoutes(app, prisma);

    console.log('All routes registered');

    await app.listen({ port: 3002, host: '0.0.0.0' });
    console.log('Product service listening on port 3002');
  } catch (err) {
    app.log.error(err);
    await prisma.$disconnect();
    await cacheService.close();
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Received SIGTERM signal, shutting down gracefully...');
  await app.close();
  await prisma.$disconnect();
  await cacheService.close();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

start();
