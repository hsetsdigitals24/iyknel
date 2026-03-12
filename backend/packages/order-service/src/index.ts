import fastify from 'fastify';
import cors from '@fastify/cors';

const app = fastify({ logger: true });

app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
});

// Health check
app.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'order-service' };
});

// TODO: Add order routes
// - GET /orders/:buyerId - list orders for buyer
// - GET /orders/:orderId - get order details
// - PUT /orders/:orderId/status - update order status (admin)
// - POST /orders/:orderId/cancel - cancel order
// - GET /orders (admin) - list all orders with filters
// - PUT /orders/:orderId (admin) - modify order before dispatch
// - POST /orders/:orderId/invoice - generate invoice
// - GET /orders/:orderId/invoice - get order invoice
// - POST /orders/:orderId/timeline - get order status timeline
// - POST /orders/:orderId/track - track order
// - POST /orders/bulk-create (sales-rep) - create multiple orders

const start = async () => {
  try {
    await app.listen({ port: 3006, host: '0.0.0.0' });
    console.log('Order service listening on port 3006');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
