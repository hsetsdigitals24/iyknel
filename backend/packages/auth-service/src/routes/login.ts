import { FastifyInstance, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { UserRole, ApiResponse } from '@iyknel/shared';
import { comparePassword, generateTokenPair } from '../utils/auth';
import { LoginRequest, AuthResponse } from '../types';

export async function loginRoute(
  fastify: FastifyInstance,
  prisma: PrismaClient
) {
  fastify.post<{ Body: LoginRequest }>(
    '/login',
    async (request: FastifyRequest<{ Body: LoginRequest }>, reply) => {
      const { email, password } = request.body;

      // Validation
      if (!email || !password) {
        return reply.status(400).send({
          success: false,
          error: 'Email and password are required',
          statusCode: 400,
        } as ApiResponse);
      }

      try {
        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            buyer: {
              select: {
                id: true,
              },
            },
          },
        });

        if (!user) {
          return reply.status(401).send({
            success: false,
            error: 'Invalid email or password',
            statusCode: 401,
          } as ApiResponse);
        }

        // Check if user is active
        if (!user.isActive) {
          return reply.status(403).send({
            success: false,
            error: 'User account is inactive',
            statusCode: 403,
          } as ApiResponse);
        }

        // Compare passwords
        const isPasswordValid = await comparePassword(password, user.passwordHash);
        if (!isPasswordValid) {
          return reply.status(401).send({
            success: false,
            error: 'Invalid email or password',
            statusCode: 401,
          } as ApiResponse);
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokenPair({
          userId: user.id,
          email: user.email,
          role: user.role as UserRole,
          buyerId: user.buyer?.id,
        });

        return reply.status(200).send({
          success: true,
          data: {
            userId: user.id,
            email: user.email,
            role: user.role,
            accessToken,
            refreshToken,
          } as AuthResponse,
          message: 'Login successful',
          statusCode: 200,
        } as ApiResponse<AuthResponse>);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to login',
          statusCode: 500,
        } as ApiResponse);
      }
    }
  );
}