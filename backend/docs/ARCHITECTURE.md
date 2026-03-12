# FMCG B2B eCommerce Backend - Architecture & Setup Guide

## Architecture Overview

This is a **microservice architecture** built with Node.js, designed for a scalable B2B FMCG eCommerce platform. The system handles product catalogs, pricing, orders, payments, inventory, and notifications.

### Tech Stack
- **Framework:** Fastify (lightweight, high-performance HTTP server)
- **Language:** TypeScript (type safety)
- **Database:** PostgreSQL (shared single database with logical schemas)
- **Job Queue:** Bull (Redis-backed async job processing)
- **API Gateway:** Nginx (routing, rate limiting, load balancing)
- **Containerization:** Docker & Docker Compose

---

## Services Overview

| Service | Port | Responsibility |
|---------|------|-----------------|
| **Auth Service** | 3001 | User authentication, JWT tokens, role management |
| **Product Service** | 3002 | Product catalog, SKU search, categories, variants |
| **Pricing Service** | 3003 | Tiered pricing rules, dynamic pricing calculations |
| **Buyer Service** | 3004 | Buyer account management, KYC, delivery addresses |
| **Cart & Checkout** | 3005 | Shopping cart, checkout process, order totals |
| **Order Service** | 3006 | Order management, status tracking, invoices |
| **Payment Service** | 3007 | Payment processing, Paystack/Flutterwave, webhooks |
| **Inventory Service** | 3008 | Stock tracking, warehouse management, movements |
| **Notification Service** | 3009 | Email, SMS notifications, templates |
| **Nginx Gateway** | 80/443 | API gateway, routing, rate limiting, CORS |

---

## Project Structure

```
backend/
├── packages/
│   ├── shared/              # Shared utilities, types, Prisma schema
│   │   ├── src/
│   │   │   ├── types.ts     # Shared TypeScript interfaces
│   │   │   └── index.ts     # Re-exports
│   │   ├── prisma/
│   │   │   └── schema.prisma # Database schema (single source of truth)
│   │   └── package.json
│   │
│   ├── auth-service/        # Authentication & authorization
│   ├── product-service/     # Product catalog & search
│   ├── pricing-service/     # Dynamic pricing engine
│   ├── buyer-service/       # Buyer account management
│   ├── cart-checkout-service/ # Shopping cart & checkout
│   ├── order-service/       # Order fulfillment
│   ├── payment-service/     # Payment gateways
│   ├── inventory-service/   # Stock management
│   └── notification-service/ # Email & SMS
│
├── docker-compose.yml       # Local development environment
├── nginx.conf              # API Gateway configuration
├── .env.example            # Environment variables template
├── .gitignore
├── package.json            # Workspace root (npm workspaces)
└── tsconfig.json           # TypeScript configuration

```

---

## Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16+ (for local dev without Docker)
- Redis (for job queue)
- Git

### 1. Clone & Install

```bash
git clone <repo>
cd backend
cp .env.example .env  # Configure environment variables
npm install
```

### 2. Generate Prisma Client

```bash
npm run prisma:generate
```

### 3. Run with Docker Compose (Recommended for Development)

```bash
npm run docker:up
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- All 9 microservices (ports 3001-3009)
- Nginx API Gateway (port 80)

Check services:
```bash
curl http://localhost/api/products/health
curl http://localhost/api/auth/health
curl http://localhost/api/orders/health
```

### 4. Run Services Locally (Without Docker)

```bash
# Terminal 1: Start PostgreSQL & Redis with Docker
docker run -d --name fmcg-postgres -e POSTGRES_PASSWORD=fmcg_password -p 5432:5432 postgres:16-alpine
docker run -d --name fmcg-redis -p 6379:6379 redis:7-alpine

# Terminal 2: Run all services concurrently
npm run dev

# Or run individual services
npm run dev:auth
npm run dev:product
npm run dev:pricing
# ... etc
```

### 5. Database Migration

```bash
# Create initial database
npm run prisma:migrate

# View database with Prisma Studio
npm run prisma:studio
```

---

## Database Schema

All services share a **single PostgreSQL database** with logical schemas:

### Key Tables
- **User / Buyer** - Authentication & buyer profile
- **Product** - SKUs, categories, variants
- **PricingRule** - Tiered pricing
- **Order / OrderItem** - Orders & line items
- **PaymentTransaction** - Payment records
- **InventoryLevel** - Stock levels per warehouse
- **Notification / EmailLog / SMSLog** - Communication logs
- **DeliveryZone** - Delivery configuration

See `packages/shared/prisma/schema.prisma` for full schema.

---

## API Routing

All requests go through Nginx on port 80:

```
GET  /api/products              → product-service
POST /api/auth/login            → auth-service
GET  /api/orders/:orderId       → order-service
POST /api/checkout              → cart-checkout-service
GET  /api/pricing/calculate     → pricing-service
POST /api/inventory/deduct      → inventory-service
POST /api/payments/webhook      → payment-service
POST /api/notifications/email   → notification-service
```

---

## Inter-Service Communication

Services communicate via:

1. **Synchronous REST APIs** - For real-time queries
   ```typescript
   // Example: Cart service calls Pricing service
   const priceResponse = await fetch(
     `${process.env.PRICING_SERVICE_URL}/pricing/calculate`,
     { method: 'POST', body: JSON.stringify({ products, buyerId }) }
   );
   ```

2. **Async Job Queue (Bull)** - For background tasks
   ```typescript
   // Example: Order service enqueues invoice generation
   const invoiceQueue = new Queue('invoice-generation', {
     connection: redis
   });
   invoiceQueue.add({ orderId }, { attempts: 3 });
   ```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fmcg_b2b
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=24h

# Payment Gateways
PAYSTACK_SECRET_KEY=pk_live_...
FLUTTERWAVE_SECRET_KEY=FLWSECK_...

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=app-specific-password

# SMS (Twilio)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...

# Frontend CORS
FRONTEND_URL=http://localhost:3000 (dev)
FRONTEND_PRODUCTION_URL=https://app.fmcgplatform.com (prod)
```

---

## Development Workflow

### Adding a New Route

1. Add to service's `src/routes/` file
2. Export route in `src/index.ts`
3. Test locally: `npm run dev:service-name`

### Database Changes

1. Modify `packages/shared/prisma/schema.prisma`
2. Run migration: `npm run prisma:migrate`
3. Regenerate Prisma client: `npm run prisma:generate`
4. All services automatically pick up changes

### Adding a Shared Utility

1. Create file in `packages/shared/src/`
2. Export from `packages/shared/src/index.ts`
3. Import in any service: `import { helper } from '@fmcg/shared'`

---

## Critical Tests

Before production, verify:

1. **Tiered Pricing**
   - Order with qty 1-10 cartons → applies base price
   - Order with qty 11-50 → applies tier 2 price
   - Order with qty 50+ → applies bulk discount

2. **Inventory Sync**
   - Create order → inventory deducted within 5 seconds
   - Low stock alert triggered at threshold

3. **Checkout Totals**
   - Subtotal + VAT + Delivery calculation correct
   - Tax configurable per region

4. **Payment Flow**
   - Paystack webhook → payment confirmed → inventory deducted
   - Order status transitions correctly (Pending → Confirmed → Processing)

5. **Performance**
   - Load 2000 SKUs
   - Execute 100 concurrent product searches
   - Response time < 3 seconds

---

## Deployment (VPS)

### 1. Production Environment Variables
Create `.env.production` with secure values for all secrets.

### 2. Build Docker Images
```bash
docker-compose -f docker-compose.yml build
```

### 3. Push to Registry
```bash
docker tag fmcg-auth-service your-registry/fmcg-auth-service:1.0.0
docker push your-registry/fmcg-auth-service:1.0.0
# ... repeat for all services
```

### 4. Deploy on VPS
```bash
# SSH into VPS
ssh user@your-vps

# Pull latest images and start
docker-compose -f docker-compose.prod.yml up -d

# Verify all services running
docker-compose ps
```

### 5. SSL/TLS with Let's Encrypt
Update `nginx.conf` to listen on 443 with SSL certificates.

---

## Monitoring & Logs

### Health Checks
```bash
# Check all services
curl http://localhost/api/products/health
curl http://localhost/api/auth/health
```

### View Logs
```bash
# All services
npm run docker:logs

# Single service
docker-compose logs -f auth-service

# Follow logs
docker-compose logs -f --tail=100
```

### Database Admin
```bash
# Open Prisma Studio
npm run prisma:studio
# Opens http://localhost:5555

# Direct psql
psql -h localhost -U fmcg_user -d fmcg_b2b
```

---

## Common Commands

```bash
# Development
npm run dev                    # Start all services
npm run build                  # Build all services
npm run test                   # Test all services

# Database
npm run prisma:generate        # Generate Prisma client
npm run prisma:migrate         # Run migrations
npm run prisma:studio          # Open Prisma Studio

# Docker
npm run docker:up              # Start all containers
npm run docker:down            # Stop all containers
npm run docker:logs            # View logs

# Individual services
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

## Next Steps

1. ✅ Monorepo structure created
2. ✅ Implement Auth Service (user registration, login)
3. ⏳ Build Product Service with caching
4. ⏳ Create Pricing Rules Engine
5. ⏳ Develop Order → Payment → Inventory flow
6. ⏳ Set up job queue for async operations
7. ⏳ Add Notification service (email/SMS)
8. ⏳ Comprehensive integration tests
9. ⏳ Deploy to staging VPS
10. ⏳ Production hardening & monitoring

---

## Support

For issues or questions, refer to service-specific README files in each `packages/*/README.md`.
