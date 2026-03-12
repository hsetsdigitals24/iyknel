# Auth Service - Quick Reference Guide

## For Developers

### 1. Using Auth in Your Service

#### Import and verify tokens:
```typescript
import { verifyToken } from '@iyknel/shared';

// In your route handler
const token = request.headers.authorization?.replace('Bearer ', '');
const user = verifyToken(token);

if (!user) {
  return reply.status(401).send({ error: 'Unauthorized' });
}

// Now use user object
console.log(user.userId, user.email, user.role);
```

#### Protect routes with role checks:
```typescript
const user = verifyToken(token);

if (!['ADMIN', 'SALES_MANAGER'].includes(user.role)) {
  return reply.status(403).send({ error: 'Forbidden' });
}
```

---

### 2. Environment Variables

Set these in your `.env` file before running:

```bash
JWT_SECRET=your-secret-key-minimum-32-chars-recommended
DATABASE_URL=postgresql://iyknel_user:pass2enter@localhost:15432/iyknel_db
FRONTEND_URL=http://localhost:3000
```

---

### 3. Common Tasks

#### Register a user programmatically:
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123",
    "confirmPassword": "SecurePass123",
    "role": "SALES_REP"
  }'
```

#### Login and store tokens:
```bash
RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }')

ACCESS_TOKEN=$(echo $RESPONSE | jq -r '.data.accessToken')
REFRESH_TOKEN=$(echo $RESPONSE | jq -r '.data.refreshToken')

echo "ACCESS_TOKEN=$ACCESS_TOKEN"
echo "REFRESH_TOKEN=$REFRESH_TOKEN"
```

#### Call a protected API:
```bash
curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

#### Refresh expired token:
```bash
curl -X POST http://localhost:3001/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"
```

---

### 4. Token Structure

**Access Token:**
- Duration: 24 hours
- Purpose: Authentication for API requests
- Usage: Include in `Authorization: Bearer <token>` header

**Refresh Token:**
- Duration: 7 days
- Purpose: Obtain new access token when expired
- Usage: Send to `/auth/refresh-token` endpoint

---

### 5. Response Format

All responses follow this structure:

```json
{
  "success": boolean,
  "data": any,              // null if error
  "message": string,        // Human readable
  "error": string,          // Only present on error
  "statusCode": number      // HTTP status code
}
```

**Success Example:**
```json
{
  "success": true,
  "data": { "userId": "abc123", "email": "user@example.com" },
  "message": "Login successful",
  "statusCode": 200
}
```

**Error Example:**
```json
{
  "success": false,
  "error": "Invalid email or password",
  "statusCode": 401
}
```

---

### 6. User Roles

You can assign these roles during registration:

```
BUYER              → Customer
SALES_REP          → Sales representative
SALES_MANAGER      → Sales team lead
WAREHOUSE_STAFF    → Warehouse operations
ADMIN              → System administrator
```

---

### 7. Debugging

**Check if service is running:**
```bash
curl http://localhost:3001/health
```

**View service logs:**
```bash
docker logs auth-service
```

**Check database connection:**
```bash
docker exec iyknel-postgres psql -U iyknel_user -d iyknel_db -c "SELECT * FROM \"User\" LIMIT 5;"
```

**Test JWT token:**
```bash
# Decode token (without verification)
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN" | jq
```

---

### 8. Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "No authentication token provided" | Missing Authorization header | Add: `Authorization: Bearer <token>` |
| "Invalid or expired token" | Token expired or wrong | Get new token from login endpoint |
| "Invalid email or password" | Wrong credentials | Verify email and password |
| "User already exists" | Email already registered | Use different email |
| "Database connection error" | Postgres not running | Run: `docker compose up postgres redis` |
| "Cannot find module" | Dependencies not installed | Run: `npm install` |

---

### 9. Production Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS/SSL
- [ ] Update `FRONTEND_URL` to production domain
- [ ] Configure CORS properly in nginx
- [ ] Set up database backups
- [ ] Enable logging and monitoring
- [ ] Rate limit auth endpoints
- [ ] Use environment variables for all secrets
- [ ] Test all auth flows end-to-end

---

### 10. Integration Examples

**In Product Service:**
```typescript
// Protect product creation endpoint
app.post('/products', async (request, reply) => {
  const token = request.headers.authorization?.replace('Bearer ', '');
  const user = verifyToken(token);
  
  if (!user || !['ADMIN', 'SALES_MANAGER'].includes(user.role)) {
    return reply.status(403).send({ error: 'Forbidden' });
  }
  
  // Create product...
});
```

**In Order Service:**
```typescript
// Track user permissions
app.get('/orders', async (request, reply) => {
  const token = request.headers.authorization?.replace('Bearer ', '');
  const user = verifyToken(token);
  
  if (!user) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  
  // BUYER can only see their own orders
  if (user.role === 'BUYER') {
    return prisma.order.findMany({
      where: { buyerId: user.buyerId }
    });
  }
  
  // ADMIN can see all orders
  return prisma.order.findMany();
});
```

---

### 11. Testing with Postman/Insomnia

**Create environment variables:**
```json
{
  "API_URL": "http://localhost",
  "AUTH_URL": "http://localhost:3001",
  "accessToken": "{{ initial_empty }}",
  "refreshToken": "{{ initial_empty }}"
}
```

**Register Request:**
```
POST {{AUTH_URL}}/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "TestPass123",
  "confirmPassword": "TestPass123",
  "role": "BUYER"
}
```

**Set token after login:**
```
POST {{AUTH_URL}}/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "TestPass123"
}

// Then set accessToken in environment from response
```

**Use token in protected endpoint:**
```
GET {{AUTH_URL}}/auth/me
Authorization: Bearer {{ accessToken }}
```

---

### 12. Performance Notes

- Token verification is fast (< 1ms)
- Password hashing is intentionally slow (~ 100ms) for security
- Database queries are indexed on email
- JWT tokens are stateless (no database lookup needed)
- Refresh tokens don't require new password verification

---

### Need Help?

Check these files for more details:
- `packages/auth-service/README.md` - Full API documentation
- `TESTING_AUTH.md` - Testing procedures and examples
- `AUTH_IMPLEMENTATION.md` - Implementation details
- `docs/ARCHITECTURE.md` - System architecture overview

