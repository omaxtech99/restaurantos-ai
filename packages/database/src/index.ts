import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __restaurantosPrisma: PrismaClient | undefined;
}

export function createPrismaClient(databaseUrl?: string): PrismaClient {
  const url = databaseUrl ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required to initialize Prisma');
  }

  return new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export function getPrismaClient(): PrismaClient {
  if (!globalThis.__restaurantosPrisma) {
    globalThis.__restaurantosPrisma = createPrismaClient();
  }
  return globalThis.__restaurantosPrisma;
}

export * from '@prisma/client';
export { PrismaClient };
