import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { createClient, RedisClientType } from 'redis';
import { JWTPayload } from '@iyknel/shared';

const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY: string = process.env.JWT_EXPIRY || '24h';

let redisClient: RedisClientType | null = null;

/**
 * Initialize Redis client for OTP storage
 */
export async function initializeRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  redisClient = createClient({ url: redisUrl });

  redisClient.on('error', (err) => console.log('Redis Client Error', err));
  redisClient.on('connect', () => console.log('Redis Client Connected'));

  await redisClient.connect();
  return redisClient;
}

/**
 * Get Redis client, initialize if needed
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient || !redisClient.isOpen) {
    return initializeRedisClient();
  }
  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.disconnect();
    redisClient = null;
  }
}
 
/**
 * Hash a password using bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare a plain password with a hashed password
 */
export async function comparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Generate a JWT token
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  } as SignOptions);
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(payload: JWTPayload): {
  accessToken: string;
  refreshToken: string;
} {
  const accessToken = generateToken(payload);
  // Refresh token with longer expiry (7 days)
  const refreshPayload = { ...payload };
  const refreshToken = jwt.sign(refreshPayload, JWT_SECRET, {
    expiresIn: '7d',
  } as SignOptions);
  return { accessToken, refreshToken };
}

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store OTP in Redis with expiry
 */
export async function storeOTPInRedis(
  email: string,
  otp: string,
  expirySeconds: number = 900 // 15 minutes default
): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const key = `otp:${email}`;
    await client.setEx(key, expirySeconds, otp);
    return true;
  } catch (error) {
    console.error('Error storing OTP in Redis:', error);
    return false;
  }
}

/**
 * Verify OTP from Redis
 */
export async function verifyOTPFromRedis(
  email: string,
  otp: string
): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const key = `otp:${email}`;
    const storedOTP = await client.get(key);

    if (!storedOTP) {
      return false;
    }

    if (storedOTP === otp) {
      // Delete OTP after successful verification
      await client.del(key);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error verifying OTP from Redis:', error);
    return false;
  }
}

/**
 * Delete OTP from Redis (on failure or manual reset)
 */
export async function deleteOTPFromRedis(email: string): Promise<void> {
  try {
    const client = await getRedisClient();
    const key = `otp:${email}`;
    await client.del(key);
  } catch (error) {
    console.error('Error deleting OTP from Redis:', error);
  }
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
