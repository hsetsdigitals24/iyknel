import { FastifyInstance, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { UserRole, ApiResponse } from '@iyknel/shared';
import { verifyToken, generateTokenPair } from '../utils/auth';
import { RefreshTokenRequest } from '../types';

export async function refreshTokenRoute(
  fastify: FastifyInstance,
  prisma: PrismaClient
) {
  fastify.post<{ Body: RefreshTokenRequest }>(
    '/refresh-token',
    async (request: FastifyRequest<{ Body: RefreshTokenRequest }>, reply) => {
      const { refreshToken } = request.body;

      if (!refreshToken) {
        return reply.status(400).send({
          success: false,
          error: 'Refresh token is required',
          statusCode: 400,
        } as ApiResponse);
      }

      // Verify refresh token
      const payload = verifyToken(refreshToken);
      if (!payload) {
        return reply.status(401).send({
          success: false,
          error: 'Invalid or expired refresh token',
          statusCode: 401,
        } as ApiResponse);
      }

      try {
        // Get user
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

        if (!user || !user.isActive) {
          return reply.status(401).send({
            success: false,
            error: 'User not found or inactive',
            statusCode: 401,
          } as ApiResponse);
        }

        // Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = generateTokenPair({
          userId: user.id,
          email: user.email,
          role: user.role as UserRole,
          buyerId: user.buyer?.id,
        });

        return reply.status(200).send({
          success: true,
          data: {
            accessToken,
            refreshToken: newRefreshToken,
          },
          message: 'Tokens refreshed successfully',
          statusCode: 200,
        } as ApiResponse);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to refresh tokens',
          statusCode: 500,
        } as ApiResponse);
      }
    }
  );
}
