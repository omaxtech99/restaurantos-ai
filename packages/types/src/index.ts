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
  /** null for PIN-login staff accounts (waiter/kitchen), which have no email. */
  email: string | null;
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
  email: string | null;
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

export type TableStatus = 'available' | 'occupied';
export type OrderStatus = 'open' | 'in_kitchen' | 'ready' | 'served' | 'paid' | 'cancelled';

export interface Branch {
  id: Uuid;
  tenantId: Uuid;
  name: string;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Table {
  id: Uuid;
  tenantId: Uuid;
  branchId: Uuid;
  label: string;
  capacity: number | null;
  status: TableStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BranchWithTables extends Branch {
  tables: Table[];
}

export interface StaffMember {
  id: Uuid;
  firstName: string;
  lastName: string;
  roles: string[];
  createdAt: string;
}

export interface PinLoginRequest {
  userId: Uuid;
  pin: string;
}

export interface CreateBranchRequest {
  name: string;
  address?: string;
}

export type UpdateBranchRequest = Partial<CreateBranchRequest>;

export interface CreateTableRequest {
  label: string;
  capacity?: number;
}

export type UpdateTableRequest = Partial<CreateTableRequest> & {
  status?: TableStatus;
};

export interface OrderItem {
  id: Uuid;
  tenantId: Uuid;
  orderId: Uuid;
  menuItemId: Uuid;
  name: string;
  quantity: number;
  unitPriceCents: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OrderPaymentMethod = 'cash' | 'online';

export interface Order {
  id: Uuid;
  tenantId: Uuid;
  branchId: Uuid;
  tableId: Uuid;
  status: OrderStatus;
  totalCents: number;
  tipCents: number;
  paymentMethod: OrderPaymentMethod | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface OrderItemInput {
  menuItemId: Uuid;
  quantity: number;
  notes?: string;
}

export interface CreateOrderRequest {
  tableId: Uuid;
  items: OrderItemInput[];
}

export interface AddOrderItemsRequest {
  items: OrderItemInput[];
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

export interface PublicTableInfo {
  id: Uuid;
  label: string;
  branchName: string;
  restaurantName: string;
}

export interface PublicTableContext {
  table: PublicTableInfo;
  categories: MenuCategoryWithItems[];
}

export interface WaiterCallEvent {
  tableId: Uuid;
  calledAt: string;
}

export interface CallWaiterResponse {
  nextAvailableAt: string;
}

export type WaitlistStatusValue = 'waiting' | 'notified' | 'seated' | 'cancelled';

export interface WaitlistEntry {
  id: Uuid;
  tenantId: Uuid;
  branchId: Uuid;
  customerName: string;
  phone: string;
  partySize: number;
  status: WaitlistStatusValue;
  notifiedAt: string | null;
  seatedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentResponse {
  configured: boolean;
  razorpayOrderId: string | null;
  keyId: string | null;
  amountCents: number;
  currency: string;
}

export interface VerifyPaymentRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}
