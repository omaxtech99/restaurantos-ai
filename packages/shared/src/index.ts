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

export const createMenuCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  position: z.number().int().min(0).max(100_000).optional(),
});

export const updateMenuCategorySchema = createMenuCategorySchema.partial();

export const DIETARY_TAGS = [
  'vegetarian',
  'vegan',
  'jain',
  'gluten_free',
  'dairy_free',
  'nut_free',
  'halal',
  'spicy',
] as const;
export type DietaryTag = (typeof DIETARY_TAGS)[number];

const tasteScale = z.number().int().min(0).max(5);

export const tasteProfileSchema = z.object({
  spicy: tasteScale,
  sweet: tasteScale,
  sour: tasteScale,
  salty: tasteScale,
  umami: tasteScale,
});

export const nutritionInfoSchema = z.object({
  calories: z.number().int().min(0).max(5_000),
  proteinG: z.number().min(0).max(500),
  carbsG: z.number().min(0).max(500),
  fatG: z.number().min(0).max(500),
});

export const createMenuItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  priceCents: z.number().int().min(0).max(100_000_00),
  isAvailable: z.boolean().optional(),
  position: z.number().int().min(0).max(100_000).optional(),
  tasteProfile: tasteProfileSchema.optional(),
  nutritionInfo: nutritionInfoSchema.optional(),
  dietaryTags: z.array(z.enum(DIETARY_TAGS)).optional(),
  photoUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

export const aiSuggestDishSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const presignMediaUploadSchema = z.object({
  kind: z.enum(['photo', 'video']),
  contentType: z.string().trim().min(1).max(100),
});

export const createBranchSchema = z.object({
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().max(300).optional(),
});

export const updateBranchSchema = createBranchSchema.partial();

export const createTableSchema = z.object({
  label: z.string().trim().min(1).max(60),
  capacity: z.number().int().min(1).max(100).optional(),
});

export const updateTableSchema = createTableSchema.partial();

export const STAFF_ROLES = ['waiter', 'kitchen'] as const;
export type StaffRoleValue = (typeof STAFF_ROLES)[number];

export const createStaffSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  role: z.enum(STAFF_ROLES),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

export const pinLoginSchema = z.object({
  userId: z.string().uuid(),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
});

export const joinWaitlistSchema = z.object({
  branchId: z.string().uuid(),
  customerName: z.string().trim().min(1).max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{7,14}$/, 'Enter a valid phone number in international format, e.g. +919876543210'),
  partySize: z.number().int().min(1).max(50),
});

export const createPaymentSchema = z.object({
  tipCents: z.number().int().min(0).max(10_000_00).optional(),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const ORDER_STATUSES = [
  'open',
  'in_kitchen',
  'ready',
  'served',
  'paid',
  'cancelled',
] as const;
export type OrderStatusValue = (typeof ORDER_STATUSES)[number];

export const orderItemInputSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  notes: z.string().trim().max(300).optional(),
});

export const createOrderSchema = z.object({
  tableId: z.string().uuid(),
  items: z.array(orderItemInputSchema).min(1),
});

export const addOrderItemsSchema = z.object({
  items: z.array(orderItemInputSchema).min(1),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatusValue, OrderStatusValue[]> = {
  open: ['in_kitchen', 'cancelled'],
  in_kitchen: ['ready', 'cancelled'],
  ready: ['served', 'cancelled'],
  served: ['paid', 'cancelled'],
  paid: [],
  cancelled: [],
};

export function isValidOrderStatusTransition(
  from: OrderStatusValue,
  to: OrderStatusValue,
): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export const PERMISSIONS = {
  TENANT_READ: 'tenant:read',
  TENANT_UPDATE: 'tenant:update',
  USER_READ: 'user:read',
  USER_MANAGE: 'user:manage',
  ROLE_MANAGE: 'role:manage',
  AUDIT_READ: 'audit:read',
  MENU_READ: 'menu:read',
  MENU_MANAGE: 'menu:manage',
  BRANCH_READ: 'branch:read',
  BRANCH_MANAGE: 'branch:manage',
  ORDER_READ: 'order:read',
  ORDER_MANAGE: 'order:manage',
  /** Narrow permission: only the open->in_kitchen and in_kitchen->ready transitions. */
  ORDER_KITCHEN: 'order:kitchen',
  /** Narrow permission: only the ready->served and served->paid transitions. */
  ORDER_SERVE: 'order:serve',
  STAFF_READ: 'staff:read',
  STAFF_MANAGE: 'staff:manage',
  WAITLIST_READ: 'waitlist:read',
  WAITLIST_MANAGE: 'waitlist:manage',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const SYSTEM_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  /** PIN-login staff role: mark-served / mark-cash-paid only, no order-taking. */
  WAITER: 'waiter',
  /** PIN-login staff role: accept order / mark ready only. */
  KITCHEN: 'kitchen',
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];
