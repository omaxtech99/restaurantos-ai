export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export type HealthStatus = {
  status: "ok" | "degraded";
  services: {
    database: "up" | "down";
    redis: "up" | "down";
  };
  timestamp: string;
};

export type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  userCount: number;
};
