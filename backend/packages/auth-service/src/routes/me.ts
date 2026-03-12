import { FastifyInstance, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { UserRole, ApiResponse } from '@iyknel/shared';
import { verifyToken } from '../utils/auth';
import { UserProfile } from '../types';

export async function meRoute(
  fastify: FastifyInstance,
  prisma: PrismaClient
) {
  fastify.get<{}>(
    '/me',
    async (request: FastifyRequest, reply) => {
      // Get token from header
      const token = request.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return reply.status(401).send({
          success: false,
          error: 'No token provided',
          statusCode: 401,
        } as ApiResponse);
      }

      // Verify token
      const payload = verifyToken(token);
      if (!payload) {
        return reply.status(401).send({
          success: false,
          error: 'Invalid or expired token',
          statusCode: 401,
        } as ApiResponse);
      }

      try {
        // Get user from database
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          include: {
            buyer: {
              select: {
                id: true,
              },
            },
          },
        });

        if (!user) {
          return reply.status(404).send({
            success: false,
            error: 'User not found',
            statusCode: 404,
          } as ApiResponse);
        }

        const userProfile: UserProfile = {
          userId: user.id,
          email: user.email,
          role: user.role as UserRole,
          buyerId: user.buyer?.id,
          isActive: user.isActive,
          createdAt: user.createdAt,
        };

        return reply.status(200).send({
          success: true,
          data: userProfile,
          message: 'User profile retrieved',
          statusCode: 200,
        } as ApiResponse<UserProfile>);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to retrieve user profile',
          statusCode: 500,
        } as ApiResponse);
      }
    }
  );
}
