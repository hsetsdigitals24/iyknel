export enum UserRole {
  ADMIN = "ADMIN",
  SALES_MANAGER = "SALES_MANAGER",
  WAREHOUSE_STAFF = "WAREHOUSE_STAFF",
  SALES_REP = "SALES_REP",
  BUYER = "BUYER",
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  buyerId?: string;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode: number;
}

export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PROCESSING = "PROCESSING",
  DISPATCHED = "DISPATCHED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  RETURNED = "RETURNED",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
  REFUNDED = "REFUNDED",
}

export interface PricingTierConfig {
  minQuantity: number;
  maxQuantity?: number;
  pricePerUnit: number;
  discount: number;
}

export interface OrderCalculation {
  subtotal: number;
  vatAmount: number;
  deliveryFee: number;
  total: number;
}
