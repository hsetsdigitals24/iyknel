import fastify from 'fastify';
import cors from '@fastify/cors';

const app = fastify({ logger: true });

app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
});

// Health check
app.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'pricing-service' };
});

// TODO: Add pricing routes
// - POST /pricing/calculate - calculate price for products + quantity + buyer tier
// - GET /pricing/rules/:productId - get pricing rules for a product
// - POST /pricing/rules (admin) - create pricing rule
// - PUT /pricing/rules/:ruleId (admin) - update pricing rule
// - DELETE /pricing/rules/:ruleId (admin) - delete pricing rule
// - GET /pricing/buyer-rates/:buyerId - get all pricing rates for a buyer
// - POST /pricing/apply-discount (admin) - apply promotional discount

const start = async () => {
  try {
    await app.listen({ port: 3003, host: '0.0.0.0' });
    console.log('Pricing service listening on port 3003');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
