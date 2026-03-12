import fastify from 'fastify';
import cors from '@fastify/cors';

const app = fastify({ logger: true });

app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
});

// Health check
app.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'payment-service' };
});

// TODO: Add payment routes
// - POST /payments/initiate - initiate payment (Paystack/Flutterwave)
// - GET /payments/:transactionId/status - check payment status
// - POST /payments/webhook/paystack - Paystack webhook handler
// - POST /payments/webhook/flutterwave - Flutterwave webhook handler
// - POST /payments/bank-transfer - verify bank transfer
// - POST /payments/refund - process refund
// - GET /payments/transactions (admin) - list transactions
// - GET /payments/order/:orderId - get payment for order
// - POST /payments/reconcile (admin) - manual reconciliation

const start = async () => {
  try {
    await app.listen({ port: 3007, host: '0.0.0.0' });
    console.log('Payment service listening on port 3007');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
