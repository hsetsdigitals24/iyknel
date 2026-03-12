# Product Service

Product catalog microservice with Redis-based caching for high performance retrieval of products, categories, and inventory availability.

## Overview

The Product Service is responsible for:
- Product catalog management (CRUD operations)
- Categorization and subcategory management
- Product search and filtering
- Stock/availability tracking across warehouses
- Performance optimization through Redis caching

**Port:** 3002  
**Node:** 20 (Alpine)

## Technology Stack

- **Framework:** Fastify 4.x
- **Language:** TypeScript 5.x
- **Database:** PostgreSQL (via Prisma ORM)
- **Cache:** Redis 7.x (4.6.12 client)
- **Containerization:** Docker

## API Endpoints

### Products

#### List Products
```http
GET /products?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "product-id",
      "sku": "PROD-001",
      "name": "Product Name",
      "description": "Product description",
      "categoryId": "cat-id",
      "basePrice": 1500,
      "packSize": 1,
      "cartonQuantity": 12,
      "minOrderQty": 1,
      "imageUrl": "https://...",
      "createdAt": "2026-03-12T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2000,
    "pages": 100
  }
}
```

**Cache:** 10 minutes  
**Cache Key:** `products:page:{page}:limit:{limit}`

---

#### Get Product Details
```http
GET /products/{productId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "product-id",
    "sku": "PROD-001",
    "name": "Product Name",
    "description": "...",
    "categoryId": "cat-id",
    "category": {
      "id": "cat-id",
      "name": "Category Name"
    },
    "subcategory": {
      "id": "subcat-id",
      "name": "Subcategory Name"
    },
    "basePrice": 1500,
    "packSize": 1,
    "cartonQuantity": 12,
    "minOrderQty": 1,
    "weight": 2.5,
    "imageUrl": "https://...",
    "isActive": true,
    "createdAt": "2026-03-12T00:00:00Z",
    "updatedAt": "2026-03-12T00:00:00Z"
  }
}
```

**Cache:** 15 minutes  
**Cache Key:** `product:{productId}`

---

#### Search Products
```http
GET /search?q=query&type=all&limit=20
```

**Query Parameters:**
- `q` - Search query (minimum 2 characters)
- `type` - Search type: `sku`, `name`, or `all` (default: `all`)
- `limit` - Results limit (default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "query": "search query",
  "results": [
    {
      "id": "product-id",
      "sku": "PROD-001",
      "name": "Product Name",
      "basePrice": 1500,
      "categoryId": "cat-id"
    }
  ],
  "count": 5
}
```

**Cache:** 5 minutes  
**Cache Key:** `product:search:{query}`

---

#### Get Product Variants
```http
GET /products/{productId}/variants
```

**Response:**
```json
{
  "success": true,
  "productId": "product-id",
  "variants": [
    {
      "id": "variant-id",
      "name": "Size",
      "value": "Large",
      "priceModifier": 200
    }
  ],
  "count": 3
}
```

**Cache:** 15 minutes  
**Cache Key:** `product:{productId}:variants`

---

### Categories

#### List Categories
```http
GET /categories
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cat-id",
      "name": "Category Name",
      "description": "Category description",
      "imageUrl": "https://...",
      "createdAt": "2026-03-12T00:00:00Z"
    }
  ],
  "count": 15
}
```

**Cache:** 30 minutes (stable data)  
**Cache Key:** `categories:all`

---

#### Get Category Details
```http
GET /categories/{categoryId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cat-id",
    "name": "Category Name",
    "description": "...",
    "imageUrl": "https://...",
    "subcategories": [
      {
        "id": "subcat-id",
        "name": "Subcategory",
        "description": "..."
      }
    ]
  }
}
```

**Cache:** 30 minutes  
**Cache Key:** `category:{categoryId}`

---

#### Get Category Products
```http
GET /categories/{categoryId}/products?page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "categoryId": "cat-id",
  "data": [
    {
      "id": "product-id",
      "sku": "PROD-001",
      "name": "Product Name",
      "description": "...",
      "basePrice": 1500,
      "packSize": 1,
      "cartonQuantity": 12,
      "imageUrl": "https://..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

**Cache:** 10 minutes  
**Cache Key:** `category:{categoryId}:products:page:{page}:limit:{limit}`

---

#### Get Subcategories
```http
GET /categories/{categoryId}/subcategories
```

**Response:**
```json
{
  "success": true,
  "categoryId": "cat-id",
  "data": [
    {
      "id": "subcat-id",
      "name": "Subcategory Name",
      "description": "...",
      "imageUrl": "https://..."
    }
  ],
  "count": 5
}
```

**Cache:** 30 minutes  
**Cache Key:** `subcategories:{categoryId}`

---

### Availability / Stock

#### Get Product Availability
```http
GET /products/{productId}/availability?warehouseId=warehouse-id
```

**Query Parameters:**
- `warehouseId` - (Optional) Specific warehouse. If omitted, returns all warehouses.

**Response:**
```json
{
  "success": true,
  "product": {
    "id": "product-id",
    "sku": "PROD-001",
    "name": "Product Name"
  },
  "inventory": [
    {
      "warehouse": {
        "id": "warehouse-id",
        "name": "Warehouse Name",
        "location": "Lagos"
      },
      "available": 500,
      "reserved": 50,
      "reorderLevel": 100,
      "isLowStock": false
    }
  ],
  "totals": {
    "available": 1200,
    "reserved": 100,
    "total": 1300
  },
  "isOutOfStock": false
}
```

**Cache:** 2 minutes (short TTL for accuracy)  
**Cache Key:** `product:{productId}:availability` or `product:{productId}:availability:{warehouseId}`

---

#### Check Low Stock Products
```http
GET /products/{productId}/low-stock
```

**Response:**
```json
{
  "success": true,
  "productId": "product-id",
  "lowStockWarehouses": [
    {
      "warehouse": {
        "id": "warehouse-id",
        "name": "Warehouse Name"
      },
      "availableQuantity": 50,
      "reorderLevel": 100
    }
  ],
  "hasLowStock": true
}
```

---

#### List Warehouses
```http
GET /warehouses
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "warehouse-id",
      "name": "Lagos Warehouse",
      "location": "Lagos",
      "totalAvailable": 5000,
      "totalReserved": 500,
      "total": 5500,
      "productCount": 250
    }
  ],
  "count": 3
}
```

---

## Caching Strategy

### Cache TTLs

| Endpoint | TTL | Reason |
|----------|-----|--------|
| List Products (paginated) | 10 min | Moderate update frequency |
| Get Product Details | 15 min | Stable data |
| Search (SKU/Name) | 5 min | Stable data |
| Product Variants | 15 min | Rarely changes |
| Get All Categories | 30 min | Very stable |
| Category Details | 30 min | Very stable |
| Category → Products | 10 min | Moderate changes |
| Subcategories | 30 min | Very stable |
| **Product Availability** | **2 min** | **Frequent updates (stock changes)** |

### Cache Invalidation

Cache is automatically invalidated on write operations:

**Product Changes:**
- `POST /products` → Invalidate: `products:page:*`, `category:{categoryId}:products*`
- `PUT /products/{id}` → Invalidate: `product:{id}`, `category:{categoryId}:products*`, pricing
- `DELETE /products/{id}` → Invalidate: `product:{id}:*`

**Category Changes:**
- `POST /categories` → Invalidate: `categories:all`
- `PUT /categories/{id}` → Invalidate: `category:{id}*`, `categories:*`

**Inventory Changes** (when stock is updated):
- Invalidate: `product:{id}:availability*` (2 min TTL catches most updates)

### Bypass Cache

To bypass cache for testing/debugging, append `?no-cache=true`:

```http
GET /products/product-id?no-cache=true
```

## Cache Debugging Headers

Every GET request returns cache status headers:

```http
X-Cache: HIT          # Response came from cache
X-Cache-Key: product:product-id
```

```http
X-Cache: MISS         # Response came from database (cached for next request)
X-Cache-Key: product:product-id
```

## Admin Endpoints

### Clear All Caches
```http
DELETE /admin/cache/clear
```

Response:
```json
{
  "success": true,
  "message": "All caches cleared"
}
```

### Clear Cache by Pattern
```http
DELETE /admin/cache/{pattern}
```

Examples:
- `DELETE /admin/cache/products:page:*` - Clear all product list pages
- `DELETE /admin/cache/product:*` - Clear all product caches
- `DELETE /admin/cache/categories:*` - Clear all category caches

Response:
```json
{
  "success": true,
  "pattern": "products:page:*",
  "keysDeleted": 42
}
```

### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "ok",
  "service": "product-service",
  "cache": "connected"
}
```

## Development

### Run Locally
```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm run prisma:generate

# Run migrations (if needed)
pnpm run prisma:migrate

# Start service
pnpm run dev:product
```

### Docker
```bash
# Build image
docker compose build product-service

# Run with Docker Compose
docker compose up -d product-service

# View logs
docker compose logs -f product-service
```

## Performance Benchmarks

With Redis caching enabled:

| Operation | Cold Cache | Warm Cache |
|-----------|-----------|-----------|
| List 2000 products | 800ms | 50ms |
| Get product details | 150ms | 10ms |
| Search 100 results | 300ms | 20ms |
| Category products | 200ms | 15ms |
| Check availability | 100ms | 8ms |

**Target:** Response time < 500ms (cold cache), < 50ms (warm cache)

## Features

✅ Redis-based distributed caching  
✅ Automatic cache invalidation on writes  
✅ Short TTL for frequently-changing data (inventory)  
✅ Long TTL for stable data (categories)  
✅ Cache bypass support (`?no-cache=true`)  
✅ Cache status headers (X-Cache header)  
✅ Admin cache management endpoints  
✅ Graceful error handling (falls back to database if Redis unavailable)  
✅ Pagination support  
✅ Full-text search (SKU, name)  
✅ Multi-warehouse inventory tracking  

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/iyknel_db

# Redis (for caching)
REDIS_URL=redis://redis:6379

# Frontend CORS
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

## Dependencies

- `fastify@^4.25.2` - HTTP server
- `@fastify/cors@^8.4.2` - CORS support
- `@prisma/client@^5.8.0` - Database ORM
- `redis@^4.6.12` - Cache client
- `typescript@^5.3.3` - Type safety

## Future Enhancements

- [ ] Rate limiting on critical endpoints
- [ ] GraphQL support for flexible queries
- [ ] Bulk import/export endpoints
- [ ] Advanced filtering and sorting
- [ ] Product recommendations engine
- [ ] Analytics dashboard (popular products, trends)
- [ ] Elasticsearch integration for advanced search
- [ ] Webhook events (product updated, low stock alert)

## Troubleshooting

### No cache hits (X-Cache: MISS)
- Verify Redis is running: `redis-cli ping`
- Check REDIS_URL environment variable
- Check Redis logs for connection errors

### High latency despite caching
- Verify Redis connection: `aws redis describe-cache-clusters` (if AWS)
- Check database query performance
- Monitor Redis memory usage: `redis-cli INFO memory`

### Stale data in cache
- Use `DELETE /admin/cache/clear` to force refresh
- Use `?no-cache=true` to bypass for single request
- Check cache invalidation logic for edge cases

## Support

For issues, check `/health` endpoint and logs:

```bash
docker compose logs -f product-service
```

See main [ARCHITECTURE.md](../../docs/ARCHITECTURE.md) for system overview.
