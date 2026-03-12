# Auth Service - Testing & Integration Guide

This document provides examples for testing the Auth Service and integrating it with other microservices.

## Quick Start Testing

### 1. Register a New User

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@example.com",
    "password": "SecurePassword123",
    "confirmPassword": "SecurePassword123",
    "role": "BUYER"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "clx1234abcd",
    "email": "buyer@example.com",
    "role": "BUYER",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully",
  "statusCode": 201
}
```

### 2. Login User

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@example.com",
    "password": "SecurePassword123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "clx1234abcd",
    "email": "buyer@example.com",
    "role": "BUYER",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful",
  "statusCode": 200
}
```

### 3. Get User Profile

```bash
curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "clx1234abcd",
    "email": "buyer@example.com",
    "role": "BUYER",
    "buyerId": null,
    "isActive": true,
    "createdAt": "2025-03-07T10:30:00Z"
  },
  "message": "User profile retrieved",
  "statusCode": 200
}
```

### 4. Refresh Tokens

```bash
curl -X POST http://localhost:3001/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Tokens refreshed successfully",
  "statusCode": 200
}
```

### 5. Request Password Reset

```bash
curl -X POST http://localhost:3001/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@example.com"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset OTP has been sent",
  "statusCode": 200
}
```

**Note:** The user will receive an email with a 6-digit OTP. In development with test SMTP, check the logs or email logs for the OTP.

### 6. Reset Password with OTP

```bash
curl -X POST http://localhost:3001/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "buyer@example.com",
    "otp": "123456",
    "newPassword": "NewSecurePassword123",
    "confirmPassword": "NewSecurePassword123"
  }'
```

**Response (on success):**
```json
{
  "success": true,
  "message": "Password reset successfully. Please login with your new password",
  "statusCode": 200
}
```

**Response (invalid OTP):**
```json
{
  "success": false,
  "error": "Invalid or expired OTP",
  "statusCode": 401
}
```

**Response (password doesn't meet requirements):**
```json
{
  "success": false,
  "error": "Password does not meet requirements: Password must contain at least one uppercase letter, Password must contain at least one number",
  "statusCode": 400
}
```

---

## Using Auth in Other Services

### Example: Protecting Routes in Product Service

```typescript
// packages/product-service/src/index.ts
import fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@iyknel/shared';

const app = fastify({ logger: true });
const prisma = new PrismaClient();

app.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
});

// Middleware to verify authentication
app.addHook('onRequest', async (request, reply) => {
  // Skip auth for health check and public endpoints
  if (request.url === '/health' || request.url.startsWith('/products/search')) {
    return;
  }

  const token = request.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return reply.status(401).send({
      success: false,
      error: 'No authentication token provided',
      statusCode: 401,
    });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return reply.status(401).send({
      success: false,
      error: 'Invalid or expired token',
      statusCode: 401,
    });
  }

  // Attach user to request
  (request as any).user = payload;
});

// Protected route example
app.post('/products', async (request, reply) => {
  const user = (request as any).user;
  
  // Only ADMIN and SALES_MANAGER can create products
  if (!['ADMIN', 'SALES_MANAGER'].includes(user.role)) {
    return reply.status(403).send({
      success: false,
      error: 'Insufficient permissions',
      statusCode: 403,
    });
  }

  // Create product logic
});

const start = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await app.listen({ port: 3002, host: '0.0.0.0' });
    console.log('Product service listening on port 3002');
  } catch (err) {
    app.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
};

start();
```

### Example: Calling Auth Service from Another Service

```typescript
// packages/order-service/src/utils/authClient.ts
import { JWTPayload } from '@iyknel/shared';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';

/**
 * Validate token by calling auth service
 */
export async function validateTokenWithAuthService(token: string): Promise<JWTPayload | null> {
  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Failed to validate token with auth service:', error);
    return null;
  }
}

/**
 * Get user details from auth service
 */
export async function getUserDetails(userId: string): Promise<any> {
  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/user/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.SERVICE_TOKEN}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get user details:', error);
    return null;
  }
}
```

---

## Test Scenarios

### Scenario 1: User Registration and Login Flow

```bash
#!/bin/bash

# Step 1: Register new user
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPassword123",
    "confirmPassword": "TestPassword123",
    "role": "SALES_REP"
  }')

ACCESS_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.accessToken')
REFRESH_TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.data.refreshToken')

echo "Registration successful!"
echo "Access Token: $ACCESS_TOKEN"
echo "Refresh Token: $REFRESH_TOKEN"

# Step 2: Get user profile
curl -s -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq

# Step 3: Refresh tokens
curl -s -X POST http://localhost:3001/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}" | jq
```

### Scenario 2: Error Handling

```bash
# Wrong password
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "WrongPassword"
  }'
# Expected: 401 Unauthorized

# Invalid email
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@example.com",
    "password": "SomePassword123"
  }'
# Expected: 401 Unauthorized

# Missing token on protected route
curl -X GET http://localhost:3001/auth/me
# Expected: 401 Unauthorized

# Expired or invalid token
curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer invalid.token.here"
# Expected: 401 Unauthorized
```

### Scenario 3: Password Reset Flow

```bash
#!/bin/bash

# Step 1: Register a new user
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "OldPassword123",
    "confirmPassword": "OldPassword123",
    "role": "BUYER"
  }')

echo "User registered"

# Step 2: Login with old password (should work)
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "OldPassword123"
  }')

echo "Login with old password successful"

# Step 3: Request password reset
FORGOT_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com"
  }')

echo "Password reset requested"
echo "Check your email for OTP (in logs for development)"

# Step 4: Note the OTP from email (e.g., 123456)
# In development, you can find it in:
# - Email service logs
# - Redis: KEYS otp:*
# - Application logs

# Step 5: Reset password with OTP
RESET_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "otp": "123456",
    "newPassword": "NewPassword789",
    "confirmPassword": "NewPassword789"
  }')

echo "Password reset successful"
echo $RESET_RESPONSE | jq

# Step 6: Try login with old password (should fail)
OLD_LOGIN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "OldPassword123"
  }')

echo "Login with old password:"
echo $OLD_LOGIN | jq '.error'
# Expected: "Invalid email or password"

# Step 7: Login with new password (should succeed)
NEW_LOGIN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "NewPassword789"
  }')

echo "Login with new password:"
echo $NEW_LOGIN | jq '.data.accessToken'
# Expected: Valid access token
```

### Scenario 4: Password Reset - Error Cases

```bash
# Test 1: Invalid OTP format
curl -X POST http://localhost:3001/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "otp": "abc",
    "newPassword": "NewPassword789",
    "confirmPassword": "NewPassword789"
  }'
# Expected: 400 Invalid OTP format

# Test 2: Expired OTP (wait 16 minutes or manually delete from Redis)
curl -X POST http://localhost:3001/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "otp": "123456",
    "newPassword": "NewPassword789",
    "confirmPassword": "NewPassword789"
  }'
# Expected: 401 Invalid or expired OTP

# Test 3: Password mismatch
curl -X POST http://localhost:3001/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "otp": "123456",
    "newPassword": "NewPassword789",
    "confirmPassword": "DifferentPassword"
  }'
# Expected: 400 Passwords do not match

# Test 4: Weak password (no uppercase)
curl -X POST http://localhost:3001/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "otp": "123456",
    "newPassword": "password123",
    "confirmPassword": "password123"
  }'
# Expected: 400 Password must contain at least one uppercase letter

# Test 5: Weak password (no number)
curl -X POST http://localhost:3001/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "otp": "123456",
    "newPassword": "NewPassword",
    "confirmPassword": "NewPassword"
  }'
# Expected: 400 Password must contain at least one number
```

### Scenario 3: Role-Based Access Control

```bash
# Register admin user
ADMIN_RESPONSE=$(curl -s -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPassword123",
    "confirmPassword": "AdminPassword123",
    "role": "ADMIN"
  }')

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | jq -r '.data.accessToken')

# In another service, verify admin role
# This would be done in the route handler using verifyToken() from shared
```

---

## Integration Points

### Frontend (React/Next.js)

```typescript
// lib/auth.ts
import { AuthResponse } from '@iyknel/auth-service';

export async function register(email: string, password: string) {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      confirmPassword: password,
      role: 'BUYER',
    }),
  });

  if (!response.ok) throw new Error('Registration failed');
  
  const data = await response.json() as ApiResponse<AuthResponse>;
  
  // Store tokens
  localStorage.setItem('accessToken', data.data.accessToken);
  localStorage.setItem('refreshToken', data.data.refreshToken);
  
  return data.data;
}

export async function login(email: string, password: string) {
  const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) throw new Error('Login failed');
  
  const data = await response.json() as ApiResponse<AuthResponse>;
  
  localStorage.setItem('accessToken', data.data.accessToken);
  localStorage.setItem('refreshToken', data.data.refreshToken);
  
  return data.data;
}

export function getAccessToken() {
  return localStorage.getItem('accessToken');
}

export async function refreshTokens() {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const response = await fetch(`${process.env.REACT_APP_API_URL}/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    // Clear tokens and redirect to login
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    return;
  }

  const data = await response.json();
  localStorage.setItem('accessToken', data.data.accessToken);
  localStorage.setItem('refreshToken', data.data.refreshToken);
}
```

---

## Performance Testing

### Load Testing Auth Endpoints

```bash
# Using Apache Bench
ab -n 1000 -c 10 -p login.json -T application/json http://localhost:3001/auth/login

# login.json file content:
# {
#   "email": "testuser@example.com",
#   "password": "TestPassword123"
# }
```

---

## Debugging Password Reset

### Viewing OTP in Redis

```bash
# Connect to Redis
redis-cli

# List all OTPs
KEYS otp:*

# Get specific OTP
GET otp:user@example.com

# Check OTP expiry
TTL otp:user@example.com

# Delete OTP (to test expiry scenarios)
DEL otp:user@example.com
```

### Email Testing in Development

For local development without real SMTP:

1. **Using Mailhog (recommended for development)**
   ```bash
   # Install and run Mailhog
   docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
   
   # Configure .env
   SMTP_HOST=localhost
   SMTP_PORT=1025
   SMTP_USER=test
   SMTP_PASSWORD=test
   
   # View emails at http://localhost:8025
   ```

2. **Using Ethereal Email (temporary testing)**
   ```bash
   # Get temporary credentials at https://ethereal.email
   # Use the provided SMTP host, port, user, password in .env
   # Emails appear at the provided URL
   ```

3. **Using Gmail App Passwords**
   ```bash
   # In Google Account settings, generate App Password
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   SMTP_FROM=your-email@gmail.com
   ```

### Viewing Application Logs

```bash
# If running with Docker
docker-compose logs -f auth-service

# Search for password reset operations
docker-compose logs auth-service | grep -i "password\|otp\|email"

# Check Redis connection
docker-compose logs auth-service | grep -i "redis"
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Token expires quickly | Check `JWT_EXPIRY` env var, increase if needed |
| "Cannot find module 'jsonwebtoken'" | Run `npm install` in shared package, rebuild |
| Database connection errors | Ensure `DATABASE_URL` env var is set correctly |
| CORS errors from frontend | Update `FRONTEND_URL` env var and CORS configuration |
| Token validation fails | Ensure `JWT_SECRET` is identical across all services |
| User not found after registration | Check database migration ran successfully |
| Password reset email not received | Check SMTP configuration in .env, verify email service is running |
| "ECONNREFUSED" for Redis | Ensure Redis is running on REDIS_URL (default: localhost:6379) |
| OTP is invalid immediately | Check Redis connection and TTL, may have expired |
| "Password does not meet requirements" | Ensure password has uppercase, lowercase, and number |
| Forgot password endpoint returns 500 | Check SMTP_HOST, SMTP_USER, SMTP_PASSWORD are configured |
| OTP never expires | Check Redis TTL configuration is working properly |

