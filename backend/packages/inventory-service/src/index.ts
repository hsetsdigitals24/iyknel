import fastify from 'fastify';
import cors from '@fastify/cors';

const app = fastify({ logger: true });

app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
});

// Health check
app.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'inventory-service' };
});

// TODO: Add inventory routes
// - GET /inventory/products/:productId - get stock levels for product
// - GET /inventory/warehouses - list all warehouses
// - GET /inventory/warehouses/:warehouseId/stock - get warehouse stock
// - POST /inventory/deduct - deduct stock (called by order service)
// - POST /inventory/restock - add stock
// - GET /inventory/low-stock - list low stock items
// - POST /inventory/adjust (admin) - manual stock adjustment
// - GET /inventory/movements - get stock movements
// - POST /inventory/bulk-import (admin) - bulk import stock
// - GET /inventory/reports (admin) - inventory reports

const start = async () => {
  try {
    await app.listen({ port: 3008, host: '0.0.0.0' });
    console.log('Inventory service listening on port 3008');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
