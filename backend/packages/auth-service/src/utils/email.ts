import nodemailer, { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

/**
 * Initialize nodemailer transporter with SMTP configuration
 */
export function initializeEmailService(): Transporter {
  if (transporter) {
    return transporter;
  }

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (!smtpUser || !smtpPassword) {
    throw new Error(
      'SMTP_USER and SMTP_PASSWORD environment variables are required'
    );
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  return transporter;
}

/**
 * Get the initialized email transporter
 */
export function getEmailTransporter(): Transporter {
  if (!transporter) {
    return initializeEmailService();
  }
  return transporter;
}

/**
 * Send password reset OTP email
 */
export async function sendPasswordResetEmail(
  email: string,
  otp: string,
  expiryMinutes: number = 15
): Promise<boolean> {
  try {
    const transporter = getEmailTransporter();
    const smtpFrom = process.env.SMTP_FROM || 'noreply@fmcgplatform.com';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center;">
          <h1 style="color: #333;">Password Reset Request</h1>
        </div>
        <div style="padding: 20px; background-color: #ffffff; border: 1px solid #ddd;">
          <p style="color: #666; font-size: 16px;">
            We received a request to reset the password for your FMCG Platform account. 
            Use the one-time password (OTP) below to reset your password.
          </p>
          <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
            <p style="margin: 0; font-size: 14px; color: #999;">One-Time Password</p>
            <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold; color: #333; letter-spacing: 5px;">
              ${otp}
            </p>
          </div>
          <p style="color: #666; font-size: 14px;">
            <strong>This OTP will expire in ${expiryMinutes} minutes.</strong> 
            If you did not request a password reset, please ignore this email.
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            Do not share this OTP with anyone. Our support team will never ask for your OTP.
          </p>
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; color: #999; font-size: 12px;">
          <p>© 2026 FMCG Platform. All rights reserved.</p>
        </div>
      </div>
    `;

    const textContent = `
      Password Reset Request
      
      We received a request to reset the password for your FMCG Platform account.
      Use the one-time password (OTP) below to reset your password.
      
      One-Time Password: ${otp}
      
      This OTP will expire in ${expiryMinutes} minutes.
      
      If you did not request a password reset, please ignore this email.
      
      Do not share this OTP with anyone. Our support team will never ask for your OTP.
      
      © 2026 FMCG Platform. All rights reserved.
    `;

    const info = await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'Password Reset - One-Time Password',
      text: textContent,
      html: htmlContent,
    });

    console.log('Password reset email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

/**
 * Close the email transporter connection
 */
export async function closeEmailService(): Promise<void> {
  if (transporter) {
    try {
      await transporter.close();
      transporter = null;
    } catch (error) {
      console.error('Error closing email service:', error);
    }
  }
}
