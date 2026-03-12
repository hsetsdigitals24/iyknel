# API Documentation

## Base URL
```
http://localhost/api  (Development)
https://api.yourdomain.com  (Production)
```

## Services & Endpoints

### Auth Service (Port 3001)
Authentication and user management

#### POST /auth/register
Register new buyer
```bash
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@company.com",
    "password": "SecurePassword123",
    "firstName": "John",
    "lastName": "Doe",
    "companyName": "ABC Supermarket",
    "businessType": "SUPERMARKET"
  }'
```

#### POST /auth/login
Login and get JWT token
```bash
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@company.com",
    "password": "SecurePassword123"
  }'

# Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-123",
      "email": "buyer@company.com",
      "role": "BUYER",
      "buyerId": "buyer-456"
    }
  }
}
```

#### GET /auth/me
Get current user profile
```bash
curl http://localhost/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Product Service (Port 3002)
Product catalog and search

#### GET /products
List all products with pagination
```bash
curl 'http://localhost/api/products?page=1&limit=20'

# Response:
{
  "success": true,
  "data": {
    "total": 245,
    "page": 1,
    "limit": 20,
    "products": [
      {
        "id": "prod-123",
        "sku": "RICE-001",
        "name": "Premium Long Grain Rice",
        "category": "Grains",
        "basePrice": 450,
        "packSize": 1,
        "cartonQuantity": 12,
        "minOrderQty": 1,
        "imageUrl": "https://cdn.yourdomain.com/product-123.jpg",
        "isActive": true
      }
    ]
  }
}
```

#### GET /products/:id
Get single product
```bash
curl http://localhost/api/products/prod-123
```

#### GET /products/search
Search products
```bash
curl 'http://localhost/api/products/search?q=rice&category=grains'
```

#### GET /categories
Get all categories
```bash
curl http://localhost/api/products/categories
```

---

### Pricing Service (Port 3003)
Dynamic pricing and tiered rules

#### POST /pricing/calculate
Calculate price for products
```bash
curl -X POST http://localhost/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "productId": "prod-123", "quantity": 25 }
    ],
    "buyerId": "buyer-456"
  }'

# Response shows tiered pricing:
{
  "success": true,
  "data": {
    "items": [
      {
        "productId": "prod-123",
        "quantity": 25,
        "unitPrice": 425,  // Tier 2 price (11-50 qty)
        "discount": 5,     // 5% buyer discount
        "subtotal": 10106.25
      }
    ],
    "subtotal": 10106.25,
    "vatAmount": 1515.94,
    "total": 11622.19
  }
}
```

---

### Buyer Service (Port 3004)
Buyer account management

#### POST /buyers/register
Create new buyer account
```bash
curl -X POST http://localhost/api/buyers/register \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "ABC Supermarket Ltd",
    "registrationNumber": "RC123456",
    "businessType": "SUPERMARKET",
    "email": "contact@abc-supermarket.com",
    "phone": "+234801234567",
    "contactPerson": "John Smith",
    "address": "123 Main Street",
    "city": "Lagos",
    "state": "Lagos"
  }'
```

#### GET /buyers/:buyerId
Get buyer profile
```bash
curl http://localhost/api/buyers/buyer-456 \
  -H "Authorization: Bearer TOKEN"
```

#### POST /buyers/:buyerId/kyc
Upload KYC documents
```bash
curl -X POST http://localhost/api/buyers/buyer-456/kyc \
  -F "documentType=NIN" \
  -F "documentFile=@nin.pdf" \
  -H "Authorization: Bearer TOKEN"
```

#### POST /buyers/:buyerId/addresses
Add delivery address
```bash
curl -X POST http://localhost/api/buyers/buyer-456/addresses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "label": "Headquarters",
    "address": "456 Commerce Lane",
    "city": "Lagos",
    "state": "Lagos",
    "zipCode": "100001",
    "latitude": 6.5244,
    "longitude": 3.3792,
    "isDefault": true
  }'
```

---

### Cart & Checkout Service (Port 3005)
Shopping cart and order creation

#### POST /cart/add
Add item to cart
```bash
curl -X POST http://localhost/api/cart/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "productId": "prod-123",
    "quantity": 15
  }'
```

#### GET /cart/:buyerId
Get current cart
```bash
curl http://localhost/api/cart/buyer-456 \
  -H "Authorization: Bearer TOKEN"

# Response:
{
  "success": true,
  "data": {
    "items": [
      {
        "productId": "prod-123",
        "quantity": 15,
        "unitPrice": 450,
        "subtotal": 6750
      }
    ],
    "subtotal": 6750,
    "estimated_delivery_zones": ["Lagos", "Ogun"]
  }
}
```

#### POST /checkout
Create order from cart
```bash
curl -X POST http://localhost/api/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "deliveryAddressId": "addr-789",
    "deliveryZone": "Lagos",
    "paymentMethod": "PAYSTACK",
    "notes": "Ring doorbell twice"
  }'

# Response:
{
  "success": true,
  "data": {
    "orderId": "order-001",
    "orderNumber": "ORD-2026-000001",
    "subtotal": 6750,
    "vatAmount": 1012.50,
    "deliveryFee": 2500,
    "total": 10262.50,
    "paymentStatus": "PENDING",
    "paymentUrl": "https://paystack.com/pay/ps_7f8g9h0i"
  }
}
```

---

### Order Service (Port 3006)
Order management and fulfillment

#### GET /orders/:buyerId
List orders for buyer
```bash
curl 'http://localhost/api/orders?page=1&limit=10' \
  -H "Authorization: Bearer TOKEN"
```

#### GET /orders/:orderId
Get order details
```bash
curl http://localhost/api/orders/order-001 \
  -H "Authorization: Bearer TOKEN"

# Response:
{
  "success": true,
  "data": {
    "id": "order-001",
    "orderNumber": "ORD-2026-000001",
    "status": "CONFIRMED",
    "buyer": {
      "id": "buyer-456",
      "companyName": "ABC Supermarket"
    },
    "items": [
      {
        "productId": "prod-123",
        "productName": "Premium Long Grain Rice",
        "quantity": 15,
        "unitPrice": 450,
        "subtotal": 6750
      }
    ],
    "subtotal": 6750,
    "vatAmount": 1012.50,
    "deliveryFee": 2500,
    "total": 10262.50,
    "paymentStatus": "COMPLETED",
    "orderStatus": "PROCESSING",
    "timeline": [
      {
        "status": "PENDING",
        "createdAt": "2026-03-06T10:00:00Z"
      },
      {
        "status": "CONFIRMED",
        "createdAt": "2026-03-06T10:15:00Z"
      },
      {
        "status": "PROCESSING",
        "createdAt": "2026-03-06T10:30:00Z"
      }
    ],
    "estimatedDeliveryDate": "2026-03-08",
    "createdAt": "2026-03-06T10:00:00Z"
  }
}
```

#### POST /orders/:orderId/invoice
Generate invoice PDF
```bash
curl -X POST http://localhost/api/orders/order-001/invoice \
  -H "Authorization: Bearer TOKEN"

# Response includes download URL
{
  "success": true,
  "data": {
    "invoiceUrl": "https://cdn.yourdomain.com/invoices/INV-order-001.pdf"
  }
}
```

---

### Payment Service (Port 3007)
Payment processing

#### POST /payments/initiate
Initiate Paystack payment
```bash
curl -X POST http://localhost/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-001",
    "amount": 1026250,
    "email": "buyer@company.com",
    "paymentMethod": "PAYSTACK"
  }'

# Response:
{
  "success": true,
  "data": {
    "authorizationUrl": "https://checkout.paystack.com/...",
    "accessCode": "ps_7f8g9h0i",
    "reference": "ref_xxxxxx"
  }
}
```

#### POST /payments/webhook/paystack
Paystack webhook (called by Paystack servers)
```
This is called automatically by Paystack when payment completes
```

#### GET /payments/order/:orderId
Check payment status
```bash
curl http://localhost/api/payments/order/order-001 \
  -H "Authorization: Bearer TOKEN"
```

---

### Inventory Service (Port 3008)
Stock management

#### GET /inventory/products/:productId
Get stock levels
```bash
curl http://localhost/api/inventory/products/prod-123

# Response:
{
  "success": true,
  "data": {
    "productId": "prod-123",
    "sku": "RICE-001",
    "warehouses": [
      {
        "id": "warehouse-1",
        "name": "Lagos Warehouse",
        "quantityOnHand": 500,
        "quantityReserved": 125,
        "quantityAvailable": 375,
        "minThreshold": 100
      }
    ]
  }
}
```

#### GET /inventory/low-stock
List low stock products (admin only)
```bash
curl http://localhost/api/inventory/low-stock \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

### Notification Service (Port 3009)
Email and SMS notifications

#### POST /notifications/email
Send email
```bash
curl -X POST http://localhost/api/notifications/email \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "buyer@company.com",
    "template": "order-confirmation",
    "data": {
      "orderNumber": "ORD-2026-000001",
      "total": "₦10,262.50"
    }
  }'
```

---

## Error Responses

### Generic Error Format
```json
{
  "success": false,
  "error": "Descriptive error message",
  "statusCode": 400
}
```

### Common Status Codes
- `200` - Success
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `500` - Server error

---

## Authentication

Include JWT token in `Authorization` header:
```bash
curl http://localhost/api/orders \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Rate Limiting

API Gateway enforces rate limits:
- **Auth endpoints**: 10 requests/minute
- **Product endpoints**: 50 requests/second
- **Other endpoints**: 100 requests/second

Rate limit headers in response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1709779200
```

---

## Pagination

List endpoints support pagination:
```bash
curl 'http://localhost/api/products?page=2&limit=50'

# Response includes:
{
  "total": 245,
  "page": 2,
  "limit": 50,
  "totalPages": 5,
  "data": [...]
}
```

---

## Webhooks

### Paystack Payment Webhook
Paystack posts to: `POST /payments/webhook/paystack`
```json
{
  "event": "charge.success",
  "data": {
    "reference": "ref_xxxxxx",
    "amount": 1026250,
    "status": "success"
  }
}
```

---

## Need Help?

- Check service health: `curl http://localhost/api/products/health`
- View logs: `npm run docker:logs`
- Submit issue: GitHub Issues
- Contact support: support@yourdomain.com
