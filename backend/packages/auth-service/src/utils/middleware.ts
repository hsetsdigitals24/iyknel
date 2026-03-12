import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from './auth';
import { JWTPayload, UserRole } from '@iyknel/shared';

/**
 * Middleware to verify JWT token from Authorization header
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
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
      error: 'Invalid or expired authentication token',
      statusCode: 401,
    });
  }

  // Attach user info to request
  (request as any).user = payload;
}

/**
 * Middleware to verify JWT token and check for specific roles
 */
export function roleMiddleware(...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
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
        error: 'Invalid or expired authentication token',
        statusCode: 401,
      });
    }

    if (!allowedRoles.includes(payload.role)) {
      return reply.status(403).send({
        success: false,
        error: 'Insufficient permissions for this action',
        statusCode: 403,
      });
    }

    // Attach user info to request
    (request as any).user = payload;
  };
}

/**
 * Extend FastifyRequest to include user property
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
