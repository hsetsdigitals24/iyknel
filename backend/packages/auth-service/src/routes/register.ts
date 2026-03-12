import { FastifyInstance, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { UserRole, ApiResponse } from '@iyknel/shared';
import { hashPassword, generateTokenPair } from '../utils/auth';
import { RegisterRequest, AuthResponse } from '../types';

export async function registerRoute(
  fastify: FastifyInstance,
  prisma: PrismaClient
) {
  fastify.post<{ Body: RegisterRequest }>(
    '/register',
    async (request: FastifyRequest<{ Body: RegisterRequest }>, reply) => {
      const { email, password, confirmPassword, role = UserRole.BUYER } =
        request.body;

      // Validation
      if (!email || !password) {
        return reply.status(400).send({
          success: false,
          error: 'Email and password are required',
          statusCode: 400,
        } as ApiResponse);
      }

      if (password !== confirmPassword) {
        return reply.status(400).send({
          success: false,
          error: 'Passwords do not match',
          statusCode: 400,
        } as ApiResponse);
      }

      if (password.length < 6) {
        return reply.status(400).send({
          success: false,
          error: 'Password must be at least 6 characters',
          statusCode: 400,
        } as ApiResponse);
      }

      try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          return reply.status(409).send({
            success: false,
            error: 'User with this email already exists',
            statusCode: 409,
          } as ApiResponse);
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const user = await prisma.user.create({
          data: {
            email,
            passwordHash,
            role,
            isActive: true,
          },
        });

        // Generate tokens
        const { accessToken, refreshToken } = generateTokenPair({
          userId: user.id,
          email: user.email,
          role: user.role as UserRole,
          buyerId: user.buyerId || undefined,
        });

        return reply.status(201).send({
          success: true,
          data: {
            userId: user.id,
            email: user.email,
            role: user.role,
            accessToken,
            refreshToken,
          } as AuthResponse,
          message: 'User registered successfully',
          statusCode: 201,
        } as ApiResponse<AuthResponse>);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to register user',
          statusCode: 500,
        } as ApiResponse);
      }
    }
  );
}
