import fastify from 'fastify';
import cors from '@fastify/cors';

const app = fastify({ logger: true });

app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
});

// Health check
app.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'notification-service' };
});

// TODO: Add notification routes
// - POST /notifications/email - send email
// - POST /notifications/sms - send SMS
// - GET /notifications/logs/email - email logs
// - GET /notifications/logs/sms - SMS logs
// - GET /notifications/:userId - get user notifications
// - POST /notifications/:notificationId/read - mark as read
// - GET /notifications/templates - list email templates
// - POST /notifications/templates (admin) - create template
// - PUT /notifications/templates/:templateId (admin) - update template

const start = async () => {
  try {
    await app.listen({ port: 3009, host: '0.0.0.0' });
    console.log('Notification service listening on port 3009');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
