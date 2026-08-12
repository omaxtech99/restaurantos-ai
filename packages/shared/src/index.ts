import { z } from 'zod';
import type { ApiErrorResponse, ApiSuccessResponse } from '@restaurantos/types';

export function createSuccessResponse<T>(
  data: T,
  meta: Record<string, unknown> | null = null,
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    meta,
    error: null,
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  details: unknown = null,
): ApiErrorResponse {
  return {
    success: false,
    data: null,
    meta: null,
    error: {
      code,
      message,
      details,
    },
  };
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a number');

export const emailSchema = z.string().trim().email().max(320);

export const signupSchema = z.object({
  tenantName: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  tenantSlug: z.string().trim().min(2).max(64).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
  tenantSlug: z.string().trim().min(2).max(64).optional(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const PERMISSIONS = {
  TENANT_READ: 'tenant:read',
  TENANT_UPDATE: 'tenant:update',
  USER_READ: 'user:read',
  USER_MANAGE: 'user:manage',
  ROLE_MANAGE: 'role:manage',
  AUDIT_READ: 'audit:read',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const SYSTEM_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];
