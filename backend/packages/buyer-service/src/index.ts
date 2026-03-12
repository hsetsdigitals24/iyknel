import fastify from 'fastify';
import cors from '@fastify/cors';

const app = fastify({ logger: true });

app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
});

// Health check
app.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'buyer-service' };
});

// TODO: Add buyer routes
// - POST /buyers/register - register new buyer
// - GET /buyers/:buyerId - get buyer profile
// - PUT /buyers/:buyerId - update buyer profile
// - POST /buyers/:buyerId/kyc - upload KYC documents
// - GET /buyers/:buyerId/kyc - get KYC status
// - POST /buyers/:buyerId/addresses - add delivery address
// - GET /buyers/:buyerId/addresses - list delivery addresses
// - DELETE /buyers/:buyerId/addresses/:addressId - delete address
// - GET /buyers/pending-approval (admin) - list pending approvals
// - POST /buyers/:buyerId/approve (admin) - approve buyer
// - POST /buyers/:buyerId/reject (admin) - reject buyer
// - POST /buyers/:buyerId/suspend (admin) - suspend buyer

const start = async () => {
  try {
    await app.listen({ port: 3004, host: '0.0.0.0' });
    console.log('Buyer service listening on port 3004');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
