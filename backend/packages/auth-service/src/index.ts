import fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import {
  registerRoute,
  loginRoute,
  meRoute,
  refreshTokenRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
} from './routes/auth';
import { initializeEmailService, closeEmailService } from './utils/email';
import { initializeRedisClient, closeRedisClient } from './utils/auth';

const app = fastify({ logger: true });
const prisma = new PrismaClient();

app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
});

// Health check
app.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'auth-service' };
});

// Register auth routes
app.register(
  async (fastify) => {
    await registerRoute(fastify, prisma);
    await loginRoute(fastify, prisma);
    await meRoute(fastify, prisma);
    await refreshTokenRoute(fastify, prisma);
    await forgotPasswordRoute(fastify, prisma);
    await resetPasswordRoute(fastify, prisma);
  },
  { prefix: '/auth' }
);

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    app.log.info(`${signal} received, shutting down gracefully`);
    await closeEmailService();
    await closeRedisClient();
    await prisma.$disconnect();
    await app.close();
    process.exit(0);
  });
});

const start = async () => {
  try {
    // Initialize services
    await initializeRedisClient();
    app.log.info('Redis connection initialized');

    initializeEmailService();
    app.log.info('Email service initialized');

    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    app.log.info('Database connection successful');

    await app.listen({ port: 3001, host: '0.0.0.0' });
    console.log('Auth service listening on port 3001');
  } catch (err) {
    app.log.error(err);
    await closeEmailService();
    await closeRedisClient();
    await prisma.$disconnect();
    process.exit(1);
  }
};

start();

