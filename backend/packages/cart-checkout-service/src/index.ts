import fastify from 'fastify';
import cors from '@fastify/cors';

const app = fastify({ logger: true });

app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
});

// Health check
app.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'cart-checkout-service' };
});

// TODO: Add cart & checkout routes
// - POST /cart/add - add item to cart
// - GET /cart/:buyerId - get cart for buyer
// - PUT /cart/update - update cart item quantity
// - DELETE /cart/remove/:itemId - remove item from cart
// - POST /cart/clear - clear entire cart
// - GET /cart/:buyerId/calculate - calculate totals (pricing + VAT + delivery)
// - POST /checkout - create order from cart
// - GET /checkout/delivery-zones - get available delivery zones
// - POST /checkout/validate - validate checkout
// - GET /checkout/orders/:orderId - get order details

const start = async () => {
  try {
    await app.listen({ port: 3005, host: '0.0.0.0' });
    console.log('Cart & Checkout service listening on port 3005');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
