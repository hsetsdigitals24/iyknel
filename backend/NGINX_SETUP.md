# Nginx Reverse Proxy Configuration Guide

## Overview

This document describes the Nginx API Gateway configuration for the Iyknel FMCG B2B eCommerce platform. The gateway acts as a reverse proxy that routes HTTP requests to appropriate microservices.

---

## Architecture

```
┌─────────────┐
│   Client    │
│ (Frontend)  │
└──────┬──────┘
       │
       │ HTTP/HTTPS
       ▼
┌─────────────────────────────────────────┐
│        Nginx API Gateway                 │
│        (Port 80 / 443)                  │
├─────────────────────────────────────────┤
│                                         │
│  • Load Balancing                       │
│  • Rate Limiting                        │
│  • Request Routing                      │
│  • Response Compression                 │
│  • Security Headers                     │
│  • SSL/TLS Termination                  │
│                                         │
└─────┬──────────────────────────────────┘
      │
      ├─► /api/auth          ────► Auth Service (3001)
      ├─► /api/products      ────► Product Service (3002)
      ├─► /api/pricing       ────► Pricing Service (3003)
      ├─► /api/buyers        ────► Buyer Service (3004)
      ├─► /api/checkout      ────► Checkout Service (3005)
      ├─► /api/cart          ────► Checkout Service (3005)
      ├─► /api/orders        ────► Order Service (3006)
      ├─► /api/payments      ────► Payment Service (3007)
      ├─► /api/inventory     ────► Inventory Service (3008)
      └─► /api/notifications ────► Notification Service (3009)
```

---

## Configuration Features

### 1. **Upstream Service Definitions**

Each service is defined as an upstream block with:
- **Load Balancing**: `least_conn` algorithm distributes requests to servers with fewest connections
- **Health Checks**: `max_fails=3 fail_timeout=30s` marks server down after 3 failures for 30 seconds
- **Connection Pooling**: `keepalive 32` maintains HTTP keepalive connections

```nginx
upstream auth_service {
  least_conn;
  server auth-service:3001 max_fails=3 fail_timeout=30s;
  keepalive 32;
}
```

### 2. **Rate Limiting**

Three tiers of rate limiting:

| Zone | Rate | Purpose |
|------|------|---------|
| `general_limit` | 100 req/s | Default for general endpoints |
| `api_limit` | 50 req/s | Standard API endpoints |
| `auth_limit` | 10 req/min | Login/register to prevent brute force |

Rate limit exceeded returns **429 (Too Many Requests)**

```nginx
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;
location /api/auth {
  limit_req zone=auth_limit burst=20 nodelay;
  proxy_pass http://auth_service;
}
```

### 3. **Reverse Proxy Headers**

Each location block sets important headers:

| Header | Purpose |
|--------|---------|
| `Host` | Original host name |
| `X-Real-IP` | Client's real IP address |
| `X-Forwarded-For` | Chain of proxy IPs |
| `X-Forwarded-Proto` | Original protocol (http/https) |
| `X-Forwarded-Host` | Original host |
| `X-Forwarded-Port` | Original port |
| `X-Request-ID` | Unique request identifier for tracing |

These headers allow backend services to:
- Log the real client IP
- Determine if request was HTTPS
- Generate correct redirect URLs

### 4. **Timeouts**

Different services have different timeout configurations:

| Service | Connect | Send | Read |
|---------|---------|------|------|
| Auth | 5s | 10s | 10s |
| Products | 5s | 15s | 15s |
| Checkout | 5s | 15s | 15s |
| Payments | 5s | 15s | 15s |
| Others | 5s | 10s | 10s |

```nginx
proxy_connect_timeout 5s;  # Time to establish connection
proxy_send_timeout 10s;     # Time to send request to backend
proxy_read_timeout 10s;     # Time to read response from backend
```

### 5. **Connection Management**

```nginx
proxy_http_version 1.1;           # Use HTTP/1.1 for better connection reuse
proxy_set_header Connection "";    # Enable keep-alive with backend
proxy_buffering off;               # Stream responses without buffering
```

### 6. **Gzip Compression**

Responses are automatically compressed for:
- JSON (API responses)
- Text, CSS, JavaScript
- XML and RSS feeds
- SVG images

Compression level: 6 (medium balance of speed/compression)

### 7. **Performance Tuning**

```nginx
worker_processes auto;        # Use all CPU cores
worker_connections 4096;      # Connections per worker
keepalive_timeout 65;         # Keep connections alive
sendfile on;                  # Efficient file transmission
tcp_nopush on;                # Wait for full packet before sending
tcp_nodelay on;               # Send immediately without buffering
```

### 8. **Security**

- `server_tokens off` - Don't expose Nginx version
- Hidden file access blocked (`location ~ /\.`)
- Appropriate HTTP status codes returned
- No information leakage in error responses

---

## API Endpoints

All requests to the API gateway use the `/api/*` path prefix:

### Base URL
```
http://localhost/api/*
```

### Routing Examples

```bash
# Auth Service
POST http://localhost/api/auth/register
POST http://localhost/api/auth/login
GET  http://localhost/api/auth/me

# Product Service
GET  http://localhost/api/products
POST http://localhost/api/products

# Order Service
GET  http://localhost/api/orders
GET  http://localhost/api/orders/{orderId}
POST http://localhost/api/orders

# Payment Service
POST http://localhost/api/payments/process
GET  http://localhost/api/payments/{paymentId}
```

---

## Health Checks

### Gateway Health

```bash
curl http://localhost/health
```

Response:
```json
{
  "status": "healthy",
  "service": "api-gateway",
  "timestamp": "2025-03-07T10:30:00Z"
}
```

### Individual Service Health

Each upstream can be monitored via:
```bash
# Auth service
curl http://auth-service:3001/health

# Product service
curl http://product-service:3002/health
```

---

## Error Handling

### 404 Not Found
```
GET http://localhost/unknown-path
```

Response:
```json
{
  "success": false,
  "error": "Not found",
  "message": "API endpoint not found. Use /api/* routes.",
  "statusCode": 404
}
```

### 429 Too Many Requests (Rate Limited)
```
Response Status: 429
```

Service returns rate limit error after burst limit exceeded.

### 502 Bad Gateway
```
Response Status: 502

{
  "success": false,
  "error": "Gateway error",
  "statusCode": 500
}
```

Occurs when upstream service is unavailable or connection fails.

---

## Local Development

### Start Services

```bash
# Option 1: Docker (recommended)
npm run docker:up

# Option 2: Local services
npm run dev
```

### Test Gateway

```bash
# Health check
curl http://localhost/health

# Register user
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123",
    "confirmPassword": "TestPassword123"
  }'

# Login
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'

# Get products
curl http://localhost/api/products
```

### View Logs

```bash
# All Nginx logs
docker logs iyknel-nginx

# Follow logs
docker logs -f iyknel-nginx

# Access logs
docker exec iyknel-nginx tail -f /var/log/nginx/access.log

# Error logs
docker exec iyknel-nginx tail -f /var/log/nginx/error.log
```

---

## Production Deployment

### 1. Enable HTTPS

The nginx.conf includes server block configuration for HTTPS. To enable:

#### Generate SSL Certificates

```bash
# Using Let's Encrypt (Certbot)
sudo certbot certonly --standalone -d yourdomain.com

# Certificates will be created at:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

#### Update nginx.conf

1. Uncomment the HTTPS server block (around line 270)
2. Update `server_name yourdomain.com`
3. Update certificate paths:
   ```nginx
   ssl_certificate /path/to/fullchain.pem;
   ssl_certificate_key /path/to/privkey.pem;
   ```
4. Also uncomment the HTTP to HTTPS redirect block

#### Reload Nginx

```bash
# Verify configuration
nginx -t

# Reload
nginx -s reload
```

### 2. Security Headers

The HTTPS configuration includes security headers:

```nginx
# HSTS: Force HTTPS for 1 year
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Clickjacking protection
add_header X-Frame-Options "DENY" always;

# MIME type sniffing protection
add_header X-Content-Type-Options "nosniff" always;

# XSS protection
add_header X-XSS-Protection "1; mode=block" always;

# Referrer policy
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Permissions policy
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

### 3. Rate Limiting Adjustments

Adjust rate limits based on expected traffic:

```nginx
# For high traffic production:
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=200r/s;

# For strict rate limiting:
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;
```

### 4. Monitoring

Monitor Nginx in production:

```bash
# Check active connections
echo "show connections" | nc localhost 8888

# Monitor in real-time
watch 'netstat -an | grep ESTABLISHED | wc -l'

# Log analysis
tail -f /var/log/nginx/access.log | grep " 5[0-9][0-9] "  # Errors
```

### 5. Scaling

For multiple backend instances:

```nginx
upstream product_service {
  least_conn;
  server product-service-1:3002 max_fails=3 fail_timeout=30s;
  server product-service-2:3002 max_fails=3 fail_timeout=30s;
  server product-service-3:3002 max_fails=3 fail_timeout=30s;
  keepalive 32;
}
```

---

## Performance Optimization

### 1. Increase Worker Connections

For high traffic, increase `worker_connections`:

```nginx
events {
  worker_connections 8192;  # Default: 1024
}
```

### 2. Enable Caching

Add to appropriate location blocks:

```nginx
# Cache static responses for 1 minute
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m;

location /api/products {
  proxy_cache api_cache;
  proxy_cache_valid 200 1m;
  proxy_cache_valid 404 1m;
  proxy_cache_key "$scheme$request_method$host$request_uri";
  add_header X-Cache-Status $upstream_cache_status;
  # ... rest of proxy configuration
}
```

### 3. Connection Pooling

Already configured with:
```nginx
keepalive 32;  # Maintain 32 idle connections per upstream
proxy_http_version 1.1;
proxy_set_header Connection "";
```

### 4. Optimize Buffer Sizes

```nginx
proxy_buffer_size 4k;
proxy_buffers 8 4k;
proxy_busy_buffers_size 8k;
```

---

## Troubleshooting

### Service Unreachable (502 Bad Gateway)

1. Check if backend service is running:
```bash
docker logs product-service
curl http://localhost:3002/health
```

2. Check Nginx error logs:
```bash
docker logs iyknel-nginx
```

3. Verify DNS resolution:
```bash
nslookup product-service
```

### High Response Times

1. Check backend service performance:
```bash
curl -w '@curl-format.txt' http://localhost:3002/products
```

2. Monitor Nginx:
```bash
docker logs iyknel-nginx | grep upstream_response_time
```

3. Increase timeouts if needed (temporary):
```nginx
proxy_connect_timeout 10s;
proxy_send_timeout 20s;
proxy_read_timeout 20s;
```

### Rate Limiting Issues

Increase burst if legitimate traffic is blocked:

```nginx
location /api/products {
  limit_req zone=api_limit burst=50 nodelay;  # Increase burst
  # ...
}
```

### Connection Issues

Check connection limits:

```bash
# Current connections
netstat -an | grep ESTABLISHED | wc -l

# Increase if needed:
# Edit docker-compose.yml and increase ulimits
```

---

## Monitoring & Logs

### Log Formats

Two log formats are configured:

**Main Format:**
```
127.0.0.1 - - [07/Mar/2025:10:30:00 +0000] "GET /api/products HTTP/1.1" 200 1234 "-" "curl/7.64.1"
```

**Detailed Format** (includes response times):
```
127.0.0.1 - - [07/Mar/2025:10:30:00 +0000] "GET /api/products HTTP/1.1" 200 1234 "-" "curl/7.64.1" rt=0.5 uct=0.1 uht=0.2 urt=0.2
```

### Metrics

- `rt` = request_time (total processing time)
- `uct` = upstream_connect_time (time to connect to backend)
- `uht` = upstream_header_time (time to first response byte)
- `urt` = upstream_response_time (response streaming time)

### Log Analysis

```bash
# Count requests by endpoint
grep "GET /api/" access.log | awk '{print $7}' | sort | uniq -c

# Find slow requests (>1s)
grep " rt=[1-9]\." access.log

# Count errors
grep " 5[0-9][0-9] " access.log | wc -l
```

---

## Configuration Files

### Docker Compose Integration

The `docker-compose.yml` file mounts the nginx.conf:

```yaml
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
    - ./ssl:/etc/nginx/ssl:ro
  depends_on:
    - auth-service
    - product-service
    # ... all other services
```

---

## Customization

### Add New Service

To add a new microservice:

1. **Define upstream:**
```nginx
upstream new_service {
  least_conn;
  server new-service:5000 max_fails=3 fail_timeout=30s;
  keepalive 32;
}
```

2. **Add location block:**
```nginx
location /api/newservice {
  limit_req zone=api_limit burst=20 nodelay;
  proxy_pass http://new_service;
  # ... standard proxy headers
}
```

3. **Update docker-compose.yml:** Add depends_on for new service

### Modify Timeouts

Change specific service timeouts:

```nginx
# For slow analytics service
location /api/analytics {
  proxy_connect_timeout 10s;
  proxy_send_timeout 30s;
  proxy_read_timeout 30s;
  # ...
}
```

---

## References

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Nginx Reverse Proxy Guide](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [HTTP Headers Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
- [Let's Encrypt (SSL Certificates)](https://letsencrypt.org/)

---

**Status:** ✅ Production-Ready Configuration

The Nginx configuration is fully functional for both development and production environments.
