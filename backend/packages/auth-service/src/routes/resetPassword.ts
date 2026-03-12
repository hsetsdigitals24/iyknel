import { FastifyInstance, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '@iyknel/shared';
import {
  hashPassword,
  verifyOTPFromRedis,
  validatePasswordStrength,
} from '../utils/auth';
import { ResetPasswordRequest } from '../types';

export async function resetPasswordRoute(
  fastify: FastifyInstance,
  prisma: PrismaClient
) {
  fastify.post<{ Body: ResetPasswordRequest }>(
    '/reset-password',
    async (request: FastifyRequest<{ Body: ResetPasswordRequest }>, reply) => {
      const { email, otp, newPassword, confirmPassword } = request.body;

      // Validation
      if (!email || !otp || !newPassword) {
        return reply.status(400).send({
          success: false,
          error: 'Email, OTP, and new password are required',
          statusCode: 400,
        } as ApiResponse);
      }

      if (newPassword !== confirmPassword) {
        return reply.status(400).send({
          success: false,
          error: 'Passwords do not match',
          statusCode: 400,
        } as ApiResponse);
      }

      if (otp.length !== 6 || !/^\d+$/.test(otp)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid OTP format',
          statusCode: 400,
        } as ApiResponse);
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        return reply.status(400).send({
          success: false,
          error:
            'Password does not meet requirements: ' +
            passwordValidation.errors.join(', '),
          statusCode: 400,
        } as ApiResponse);
      }

      try {
        // Verify OTP from Redis
        const isOTPValid = await verifyOTPFromRedis(email, otp);

        if (!isOTPValid) {
          return reply.status(401).send({
            success: false,
            error: 'Invalid or expired OTP',
            statusCode: 401,
          } as ApiResponse);
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          return reply.status(404).send({
            success: false,
            error: 'User not found',
            statusCode: 404,
          } as ApiResponse);
        }

        // Hash new password
        const newPasswordHash = await hashPassword(newPassword);

        // Update user password
        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordHash: newPasswordHash,
          },
        });

        return reply.status(200).send({
          success: true,
          message:
            'Password reset successfully. Please login with your new password',
          statusCode: 200,
        } as ApiResponse);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to reset password',
          statusCode: 500,
        } as ApiResponse);
      }
    }
  );
}
