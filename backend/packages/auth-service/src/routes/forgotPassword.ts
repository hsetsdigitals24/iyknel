import { FastifyInstance, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '@iyknel/shared';
import {
  generateOTP,
  storeOTPInRedis,
  deleteOTPFromRedis,
} from '../utils/auth';
import { sendPasswordResetEmail } from '../utils/email';
import { ForgotPasswordRequest } from '../types';

export async function forgotPasswordRoute(
  fastify: FastifyInstance,
  prisma: PrismaClient
) {
  fastify.post<{ Body: ForgotPasswordRequest }>(
    '/forgot-password',
    async (request: FastifyRequest<{ Body: ForgotPasswordRequest }>, reply) => {
      const { email } = request.body;

      // Validation
      if (!email) {
        return reply.status(400).send({
          success: false,
          error: 'Email is required',
          statusCode: 400,
        } as ApiResponse);
      }

      try {
        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email },
        });

        // For security, don't reveal if user exists or not
        if (!user) {
          return reply.status(200).send({
            success: true,
            message:
              'If an account exists with this email, a password reset OTP has been sent',
            statusCode: 200,
          } as ApiResponse);
        }

        // Generate OTP
        const otp = generateOTP();

        // Store OTP in Redis (15 minutes expiry)
        const otpStored = await storeOTPInRedis(email, otp, 900);

        if (!otpStored) {
          fastify.log.error('Failed to store OTP in Redis for email:', email);
          return reply.status(500).send({
            success: false,
            error: 'Failed to process password reset request',
            statusCode: 500,
          } as ApiResponse);
        }

        // Send email with OTP
        const emailSent = await sendPasswordResetEmail(email, otp, 15);

        if (!emailSent) {
          fastify.log.error('Failed to send password reset email to:', email);
          // Delete OTP if email fails to send
          await deleteOTPFromRedis(email);
          return reply.status(500).send({
            success: false,
            error: 'Failed to send password reset email',
            statusCode: 500,
          } as ApiResponse);
        }

        return reply.status(200).send({
          success: true,
          message:
            'If an account exists with this email, a password reset OTP has been sent',
          statusCode: 200,
        } as ApiResponse);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to process password reset request',
          statusCode: 500,
        } as ApiResponse);
      }
    }
  );
}
