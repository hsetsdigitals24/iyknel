# Auth Service

Authentication and authorization microservice for the Iyknel FMCG B2B eCommerce platform.

## Features

- User registration with email validation
- User login with JWT tokens
- Token refresh mechanism
- User profile retrieval
- Password reset flow (forgot password → OTP → reset)
- Role-based access control (ADMIN, SALES_MANAGER, WAREHOUSE_STAFF, SALES_REP, BUYER)
- Password hashing with bcryptjs
- Secure JWT token generation and verification
- OTP-based password recovery via email

## API Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "confirmPassword": "securePassword123",
  "role": "BUYER" // optional, defaults to BUYER
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "userId": "clx1234abcd",
    "email": "user@example.com",
    "role": "BUYER",
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  },
  "message": "User registered successfully",
  "statusCode": 201
}
```

**Error Responses:**
- 400: Email and password required / Passwords don't match / Password too short
- 409: User already exists with that email
- 500: Server error

---

### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "clx1234abcd",
    "email": "user@example.com",
    "role": "BUYER",
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  },
  "message": "Login successful",
  "statusCode": 200
}
```

**Error Responses:**
- 400: Email and password required
- 401: Invalid email or password
- 403: User account is inactive
- 500: Server error

---

### GET /auth/me
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "clx1234abcd",
    "email": "user@example.com",
    "role": "BUYER",
    "buyerId": "clx5678efgh",
    "isActive": true,
    "createdAt": "2025-03-07T10:30:00Z"
  },
  "message": "User profile retrieved",
  "statusCode": 200
}
```

**Error Responses:**
- 401: No token provided / Invalid or expired token
- 404: User not found
- 500: Server error

---

### POST /auth/refresh-token
Refresh access and refresh tokens using a valid refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  },
  "message": "Tokens refreshed successfully",
  "statusCode": 200
}
```

**Error Responses:**
- 400: Refresh token required
- 401: Invalid or expired refresh token / User not found or inactive
- 500: Server error

---

### POST /auth/forgot-password
Request a password reset OTP via email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset OTP has been sent",
  "statusCode": 200
}
```

**Error Responses:**
- 400: Email is required
- 500: Failed to process password reset request

**Process:**
1. User provides email address
2. System validates email and generates a 6-digit OTP
3. OTP is stored in Redis with 15-minute expiration
4. OTP is sent to user's email
5. For security, endpoint returns the same message whether email exists or not (prevents email enumeration)

---

### POST /auth/reset-password
Reset password using OTP received via email.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "NewSecurePassword123",
  "confirmPassword": "NewSecurePassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successfully. Please login with your new password",
  "statusCode": 200
}
```

**Error Responses:**
- 400: Missing required fields / Passwords don't match / Invalid OTP format / Password doesn't meet requirements
- 401: Invalid or expired OTP
- 404: User not found
- 500: Server error

**Process:**
1. User provides email, OTP (from email), and new password
2. System validates OTP format (6 digits)
3. System validates password strength (see Password Requirements)
4. System verifies OTP from Redis
5. If valid, OTP is deleted from Redis
6. User password is updated in database
7. User can login immediately with new password

---

### GET /health
Health check endpoint.

**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "auth-service"
}
```

## Development

### Start the service
```bash
npm run dev
```

### Build the service
```bash
npm run build
```

### Run tests
```bash
npm run test
```

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/fmcg_b2b

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRY=24h

# Redis (for OTP storage)
REDIS_URL=redis://localhost:6379

# Email Configuration (for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
SMTP_FROM=noreply@fmcgplatform.com

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000
```

## Token Details

### Access Token
- Expires in: 24 hours (configurable via JWT_EXPIRY)
- Used for: Authenticating API requests
- Location: Authorization header as Bearer token

### Refresh Token
- Expires in: 7 days
- Used for: Obtaining new access tokens without re-authenticating
- Location: Sent to client in response, client must store securely

## Password Requirements

### Registration & Reset
Passwords must meet the following requirements:
- Minimum 6 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- Hashed with bcryptjs (salt rounds: 10)
- Never logged or exposed in responses

### Examples
- ✓ ValidPass123
- ✓ MyPassword2025
- ✗ password (no uppercase or numbers)
- ✗ PASSWORD123 (no lowercase)
- ✗ Pass12 (too short - only 6 chars required, but must have uppercase/lowercase/number)

## Security Notes

1. **Never expose** the JWT_SECRET in version control
2. **Use HTTPS** in production to protect tokens in transit
3. **Store tokens** securely on the client (httpOnly cookie recommended)
4. **Validate tokens** on protected routes before processing requests
5. **Implement rate limiting** on login/register endpoints
6. **Use password reset** flow for forgotten passwords (not yet implemented)

## JWT Payload

```typescript
{
  userId: string;          // User ID from database
  email: string;           // User email
  role: UserRole;          // User role (ADMIN, SALES_REP, etc.)
  buyerId?: string;        // Associated buyer ID (if applicable)
  iat?: number;            // Issued at timestamp
  exp?: number;            // Expiration timestamp
}
```

## Integration with Other Services

Other services should verify JWT tokens for protected routes:

```typescript
// Example middleware for other services
async function verifyAuth(request: FastifyRequest) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    throw new Error('Authentication required');
  }
  
  // Call auth service or use shared jwt verifyToken function
  const payload = verifyToken(token);
  if (!payload) {
    throw new Error('Invalid token');
  }
  
  return payload;
}
```

## Future Enhancements

- [ ] Email verification on registration
- [x] Password reset flow (forgot password → OTP → reset) ✅ Implemented
- [ ] 2FA support
- [ ] OAuth2 integration (Google, etc.)
- [ ] Rate limiting on auth endpoints
- [ ] Login/logout audit logs
- [ ] Session management
- [ ] Account lockout after failed attempts
- [ ] Password reset via token links (alternative to OTP)
