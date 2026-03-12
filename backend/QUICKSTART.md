# FMCG Backend - Quick Start Guide

## Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Git

## Option 1: Run with Docker Compose (Recommended - One Command!)

```bash
# 1. Clone and setup env
git clone <repo> backend
cd backend
cp .env.example .env

# 2. Start everything
npm run docker:up

# 3. Check services are running
sleep 10
curl http://localhost/api/products/health
curl http://localhost/api/auth/health
curl http://localhost/api/orders/health

# 4. View logs
npm run docker:logs

# 5. Stop when done
npm run docker:down
```

**This starts:**
- PostgreSQL (port 5432)
- Redis (port 6379)
- All 9 microservices (ports 3001-3009)
- Nginx API Gateway (port 80)

---

## Option 2: Run Locally Without Docker

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npm run prisma:generate

# 3. Start Docker containers for databases only
docker run -d --name fmcg-postgres \
  -e POSTGRES_PASSWORD=fmcg_password \
  -p 5432:5432 \
  postgres:16-alpine

docker run -d --name fmcg-redis \
  -p 6379:6379 \
  redis:7-alpine

# 4. Create database
npm run prisma:migrate

# 5. Run all services (opens Browsersync dashboard)
npm run dev

# Or run individual services in separate terminals
npm run dev:auth
npm run dev:product
npm run dev:pricing
npm run dev:buyer
npm run dev:checkout
npm run dev:order
npm run dev:payment
npm run dev:inventory
npm run dev:notification
```

---

## API Gateway Routes

All requests go through Nginx on `http://localhost`:

```
GET  /api/products              → Product Service (3002)
POST /api/auth/login            → Auth Service (3001)
GET  /api/orders/:orderId       → Order Service (3006)
POST /api/checkout              → Checkout Service (3005)
GET  /api/pricing/calculate     → Pricing Service (3003)
GET  /api/buyers/:buyerId       → Buyer Service (3004)
POST /api/payments/initiate     → Payment Service (3007)
GET  /api/inventory/products    → Inventory Service (3008)
POST /api/notifications/email   → Notification Service (3009)
```

---

## Database

### View Database with Prisma Studio
```bash
npm run prisma:studio
# Opens http://localhost:5555
```

### Run Migrations
```bash
npm run prisma:migrate
```

### Direct Access (psql)
```bash
psql -h localhost -U fmcg_user -d fmcg_b2b
```

**Credentials:**
- Host: `localhost`
- User: `fmcg_user`
- Password: `fmcg_password`
- Database: `fmcg_b2b`

---

## Development Commands

```bash
# Start all services
npm run dev

# Build all packages
npm run build

# Run tests
npm run test

# Docker
npm run docker:up      # Start containers
npm run docker:down    # Stop containers
npm run docker:logs    # View logs

# Database
npm run prisma:generate   # Generate client
npm run prisma:migrate    # Create migrations
npm run prisma:studio     # Open UI editor
```

---

## Environment Variables

Create `.env` from `.env.example`:

```bash
# Database
DATABASE_URL=postgresql://fmcg_user:fmcg_password@localhost:5432/fmcg_b2b
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=24h

# Payment (get from providers)
PAYSTACK_SECRET_KEY=sk_test_...
FLUTTERWAVE_SECRET_KEY=FLWSECK_...

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# SMS (Twilio)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890

# Frontend
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

---

## Troubleshooting

### Port Already in Use
```bash
# Docker: Stop existing containers
npm run docker:down

# Local: Kill processes
lsof -i :3001  # Find process on port 3001
kill -9 <PID>
```

### Database Connection Failed
```bash
# Check database is running
docker ps | grep postgres

# Check credentials in .env
cat .env | grep DATABASE_URL

# Restart database
docker rm fmcg-postgres
docker run -d --name fmcg-postgres -e POSTGRES_PASSWORD=fmcg_password -p 5432:5432 postgres:16-alpine
```

### Services Not Starting
```bash
# View logs for a service
docker-compose logs auth-service
npm run docker:logs | grep auth-service

# Check all containers
docker-compose ps
```

### Port 80 Access Denied (Linux)
```bash
# Use sudo or change Nginx to port 8080
sudo npm run docker:up

# Or edit docker-compose.yml:
# ports:
#   - "8080:80"  # Access via http://localhost:8080
```

---

## Testing the API

### Health Check
```bash
curl http://localhost/api/products/health
```

### Create Buyer (Auth Service)
```bash
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@test.com",
    "password": "TestPassword123",
    "companyName": "Test Company"
  }'
```

### Get Products (Product Service)
```bash
curl http://localhost/api/products?page=1&limit=20
```

### Calculate Pricing (Pricing Service)
```bash
curl -X POST http://localhost/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "products": [
      { "productId": "123", "quantity": 15 }
    ],
    "buyerId": "buyer-456"
  }'
```

---

## Next Steps

1. ✅ Monorepo setup complete
2. ✅ Docker & Nginx configured
3. ⏳ Implement Auth Service routes
4. ⏳ Build Product Service with search
5. ⏳ Create Pricing Rules Engine
6. ⏳ Test order flow (Checkout → Payment → Inventory)
7. ⏳ Deploy to VPS with CI/CD

---

## Useful Links

- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Fastify Docs](https://www.fastify.io/)
- [Prisma Docs](https://www.prisma.io/docs/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Redis Docs](https://redis.io/documentation)

---

## Support

For issues, check:
1. `docs/ARCHITECTURE.md` - System architecture
2. `docs/DEPLOYMENT.md` - Production deployment
3. Service README files in `packages/*/README.md`
