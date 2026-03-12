import { UserRole } from '@iyknel/shared';

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  role?: UserRole;
  companyName?: string;
  contactPerson?: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
  email: string;
  role: UserRole;
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  userId: string;
  email: string;
  role: UserRole;
  buyerId?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

