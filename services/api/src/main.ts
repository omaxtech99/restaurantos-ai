import cors from "cors";
import express from "express";
import Redis from "ioredis";
import { prisma } from "@restaurantos/database";
import type { ApiResponse, HealthStatus, TenantSummary } from "@restaurantos/shared";

const app = express();
const port = Number(process.env.API_PORT ?? 4000);
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

app.use(cors());
app.use(express.json());

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
});

async function checkRedis(): Promise<"up" | "down"> {
  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }
    const pong = await redis.ping();
    return pong === "PONG" ? "up" : "down";
  } catch {
    return "down";
  }
}

async function checkDatabase(): Promise<"up" | "down"> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "up";
  } catch {
    return "down";
  }
}

app.get("/health", async (_req, res) => {
  const [database, redisStatus] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);

  const payload: ApiResponse<HealthStatus> = {
    success: true,
    data: {
      status: database === "up" && redisStatus === "up" ? "ok" : "degraded",
      services: {
        database,
        redis: redisStatus,
      },
      timestamp: new Date().toISOString(),
    },
  };

  res.json(payload);
});

app.get("/api/v1/tenants", async (_req, res) => {
  const tenants = await prisma.tenant.findMany({
    include: {
      _count: {
        select: { users: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const data: TenantSummary[] = tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    userCount: tenant._count.users,
  }));

  const payload: ApiResponse<TenantSummary[]> = {
    success: true,
    data,
  };

  res.json(payload);
});

app.post("/api/v1/tenants", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const slug = typeof req.body?.slug === "string" ? req.body.slug.trim() : "";

  if (!name || !slug) {
    res.status(400).json({
      success: false,
      message: "name and slug are required",
    });
    return;
  }

  const tenant = await prisma.tenant.create({
    data: { name, slug },
    include: {
      _count: {
        select: { users: true },
      },
    },
  });

  const payload: ApiResponse<TenantSummary> = {
    success: true,
    data: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      userCount: tenant._count.users,
    },
    message: "Tenant created",
  };

  res.status(201).json(payload);
});

app.listen(port, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${port}`);
});
