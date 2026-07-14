import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const adapter = new PrismaPg(connectionString);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

function hasCourseField(client: PrismaClient, field: string): boolean {
  const models = (
    client as unknown as {
      _runtimeDataModel?: { models?: Record<string, { fields?: Record<string, unknown> }> };
    }
  )._runtimeDataModel?.models;
  const fields = models?.Course?.fields;
  return Boolean(fields && field in fields);
}

function getPrismaClient(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing) {
    // After `prisma generate`, Next HMR can keep a stale global client.
    if (process.env.NODE_ENV !== 'production' && !hasCourseField(existing, 'enabledGames')) {
      void existing.$disconnect().catch(() => undefined);
      globalForPrisma.prisma = undefined;
    } else {
      return existing;
    }
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrismaClient();
