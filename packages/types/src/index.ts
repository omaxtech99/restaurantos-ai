export type Uuid = string;

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';

export type AuditAction =
  | 'auth.signup'
  | 'auth.login'
  | 'auth.logout'
  | 'auth.refresh'
  | 'auth.password_reset_requested'
  | 'auth.password_reset_completed'
  | 'auth.email_verification_requested'
  | 'auth.email_verified'
  | 'auth.failed_login';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: Record<string, unknown> | null;
  error: null;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details: unknown;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  meta: null;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthUser {
  id: Uuid;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: Uuid;
  emailVerifiedAt: string | null;
  roles: string[];
  permissions: string[];
}

export interface AuthSessionResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface JwtAccessPayload {
  sub: Uuid;
  email: string;
  tenantId: Uuid;
  roles: string[];
  permissions: string[];
  sessionId: Uuid;
  type: 'access';
}

export interface JwtRefreshPayload {
  sub: Uuid;
  tenantId: Uuid;
  sessionId: Uuid;
  type: 'refresh';
}

export interface TenantSummary {
  id: Uuid;
  name: string;
  slug: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  checks: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
  };
  timestamp: string;
}

export interface SignupRequest {
  tenantName: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
  tenantSlug?: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface MenuCategory {
  id: Uuid;
  tenantId: Uuid;
  name: string;
  description: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: Uuid;
  tenantId: Uuid;
  categoryId: Uuid;
  name: string;
  description: string | null;
  priceCents: number;
  isAvailable: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategoryWithItems extends MenuCategory {
  items: MenuItem[];
}

export interface CreateMenuCategoryRequest {
  name: string;
  description?: string;
  position?: number;
}

export type UpdateMenuCategoryRequest = Partial<CreateMenuCategoryRequest>;

export interface CreateMenuItemRequest {
  categoryId: Uuid;
  name: string;
  description?: string;
  priceCents: number;
  isAvailable?: boolean;
  position?: number;
}

export type UpdateMenuItemRequest = Partial<CreateMenuItemRequest>;
