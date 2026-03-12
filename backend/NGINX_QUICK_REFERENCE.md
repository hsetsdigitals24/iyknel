# Nginx API Gateway - Quick Reference

## Quick Commands

### Gateway Health
```bash
# One-liner health check
curl http://localhost/health | jq

# All services status
./nginx-tools.sh report
```

### Testing
```bash
# Test all services
./nginx-tools.sh test-all

# Test authentication flow
./nginx-tools.sh test-auth

# Test individual service
curl http://localhost/api/products

# Check response times
./nginx-tools.sh response-times
```

### Monitoring
```bash
# Watch live traffic
./nginx-tools.sh monitor

# View access logs
./nginx-tools.sh logs access

# View error logs
./nginx-tools.sh logs error

# Docker logs
docker logs -f iyknel-nginx
```

### Performance Testing
```bash
# Load test - 1000 requests, 10 concurrent
./nginx-tools.sh load-test 1000 10

# Test rate limiting
./nginx-tools.sh test-ratelimit
```

---

## API Endpoints

### Auth Service
```bash
# Register
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}

# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Get Profile (requires token)
GET /api/auth/me
Authorization: Bearer <token>

# Refresh Token
POST /api/auth/refresh-token
{
  "refreshToken": "<refresh_token>"
}
```

### Products Service
```bash
# List Products
GET /api/products

# Get Product
GET /api/products/{id}

# Create Product
POST /api/products
Authorization: Bearer <token>

# Update Product
PUT /api/products/{id}
Authorization: Bearer <token>
```

### Orders Service
```bash
# List Orders
GET /api/orders
Authorization: Bearer <token>

# Get Order
GET /api/orders/{orderId}
Authorization: Bearer <token>

# Create Order
POST /api/orders
Authorization: Bearer <token>
```

### Checkout Service
```bash
# Get Cart
GET /api/cart
Authorization: Bearer <token>

# Add to Cart
POST /api/cart
{
  "productId": "...",
  "quantity": 10
}

# Checkout
POST /api/checkout
Authorization: Bearer <token>
```

### Payment Service
```bash
# Process Payment
POST /api/payments/process
Authorization: Bearer <token>
{
  "orderId": "...",
  "amount": 5000,
  "currency": "NGN"
}

# Get Payment Status
GET /api/payments/{paymentId}
Authorization: Bearer <token>
```

---

## Common Workflows

### Register and Login
```bash
#!/bin/bash

# Step 1: Register
REGISTER=$(curl -s -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123",
    "confirmPassword": "SecurePassword123",
    "role": "BUYER"
  }')

TOKEN=$(echo $REGISTER | jq -r '.data.accessToken')

# Step 2: Use token
curl -s -X GET http://localhost/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Create and Track Order
```bash
#!/bin/bash

# Login
AUTH=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "buyer@example.com", "password": "password123"}')

TOKEN=$(echo $AUTH | jq -r '.data.accessToken')

# Create order
ORDER=$(curl -s -X POST http://localhost/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "buyerId": "...",
    "items": [
      {"productId": "prod123", "quantity": 10}
    ]
  }')

ORDER_ID=$(echo $ORDER | jq -r '.data.id')

# Track order
curl -s -X GET "http://localhost/api/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## Rate Limits

| Endpoint | Limit | Burst | Status Code |
|----------|-------|-------|-------------|
| /api/auth | 10/min | 20 | 429 |
| /api/* | 50/s | 20-30 | 429 |
| /health | 100/s | ∞ | N/A |

**Example Rate Limit Response:**
```json
HTTP/1.1 429 Too Many Requests

{
  "success": false,
  "error": "Gateway error",
  "statusCode": 500
}
```

### Handling Rate Limits
```bash
# Check rate limit headers
curl -i http://localhost/api/auth/login

# Response will include (if applicable):
# Retry-After: 60
```

---

## Docker Commands

### Container Management
```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# Restart specific service
docker-compose restart auth-service

# View service logs
docker logs -f auth-service

# Connect to container
docker exec -it auth-service /bin/sh
```

### Network Debugging
```bash
# Check if container can reach another
docker exec auth-service ping product-service

# DNS resolution
docker exec auth-service nslookup product-service

# Check port listening
docker exec iyknel-nginx netstat -tlnp
```

---

## Environment Configuration

### Development (http://localhost)
```bash
FRONTEND_URL=http://localhost:3000
JWT_SECRET=dev-secret-key
JWT_EXPIRY=24h
NODE_ENV=development
```

### Production (https://api.example.com)
```bash
FRONTEND_URL=https://app.example.com
JWT_SECRET=<strong-random-secret>
JWT_EXPIRY=12h
NODE_ENV=production
```

---

## Troubleshooting

### Service Unreachable (502)
```bash
# 1. Check if service is running
docker ps | grep product-service

# 2. Check service health
curl http://product-service:3002/health

# 3. Check Nginx logs
docker logs iyknel-nginx

# 4. Restart service
docker-compose restart product-service
```

### Rate Limited
```bash
# Check current rate
curl -v http://localhost/api/auth/ 2>&1 | grep retry

# Wait for reset (rate windows are 10 minutes for auth)
sleep 600

# Verify limit cleared
curl http://localhost/api/auth/
```

### Slow Responses
```bash
# Check response time
curl -w '@curl-format.txt' http://localhost/api/products

# Check backend performance
docker stats

# View detailed logs
./nginx-tools.sh logs access | grep "urt="  # upstream response time
```

### Connection Refused
```bash
# Check if Nginx is running
docker ps | grep nginx

# Check port
netstat -tlnp | grep 80

# Restart Nginx
docker-compose restart nginx
```

---

## Performance Tuning

### For Development
```nginx
# Quick iteration, less optimization
worker_connections 1024
gzip_comp_level 1
```

### For Production
```nginx
# High throughput optimization
worker_connections 8192
gzip_comp_level 6
proxy_cache_path /var/cache/nginx keys_zone=api_cache:100m
```

---

## SSL/TLS Setup

### Generate Self-Signed Certificate
```bash
./nginx-tools.sh ssl-cert
```

### Generate Let's Encrypt Certificate
```bash
# Install certbot
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d api.example.com

# Certificate will be at:
# /etc/letsencrypt/live/api.example.com/fullchain.pem
# /etc/letsencrypt/live/api.example.com/privkey.pem
```

### Update nginx.conf
```nginx
ssl_certificate /path/to/fullchain.pem;
ssl_certificate_key /path/to/privkey.pem;
```

### Auto-Renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Enable auto-renewal
sudo systemctl enable certbot.timer
```

---

## Monitoring & Alerting

### Watch for Errors
```bash
# Real-time error monitoring
./nginx-tools.sh logs error | grep -i "upstream"

# Count errors by hour
grep "5[0-9][0-9]" /var/log/nginx/access.log | \
  awk '{print $4}' | cut -d: -f1 | sort | uniq -c
```

### Traffic Analysis
```bash
# Requests per second
tail -f /var/log/nginx/access.log | \
  awk '{print $4}' | uniq -c

# Top endpoints
awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -rn
```

### Uptime Check
```bash
# Continuous monitoring
watch -n 5 "./nginx-tools.sh report"

# Alert on downtime
curl -f http://localhost/health || alert "Gateway down"
```

---

## Quick Fixes

| Problem | Solution |
|---------|----------|
| Container won't start | `docker logs <container>` |
| Port already in use | `lsof -i :80` then kill process |
| High memory usage | Reduce `worker_connections` |
| Slow API | Check `proxy_read_timeout` |
| CORS errors | Check `FRONTEND_URL` in docker-compose |
| SSL errors | Verify certificate paths and renewal |
| Rate limit too strict | Increase `burst` parameter |

---

## Files Reference

| File | Purpose |
|------|---------|
| `nginx.conf` | Main Nginx configuration |
| `docker-compose.yml` | Service definitions |
| `NGINX_SETUP.md` | Detailed documentation |
| `nginx-tools.sh` | Testing and monitoring tool |
| `.env` | Environment variables |
| `ssl/` | SSL certificates directory |

---

**Last Updated:** March 7, 2026

For more details, see `NGINX_SETUP.md`
