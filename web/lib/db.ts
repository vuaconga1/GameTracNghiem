import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool, type PoolConfig } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

/**
 * pg 8.22+ treats `sslmode=require` as `verify-full` and ignores an explicit
 * `ssl: { rejectUnauthorized: false }` when that query param is present.
 * Supabase (and some local TLS MITM setups) then fail with:
 * "self-signed certificate in certificate chain".
 *
 * Strip sslmode from the URL and set SSL options on the Pool instead.
 */
export function buildPgPoolConfig(connectionString: string): PoolConfig {
  const url = new URL(connectionString);
  const wantsSsl =
    /supabase\.com|neon\.tech/i.test(url.hostname) ||
    ['require', 'verify-ca', 'verify-full', 'prefer'].includes(
      url.searchParams.get('sslmode') ?? '',
    ) ||
    url.searchParams.get('ssl') === 'true';

  if (wantsSsl) {
    url.searchParams.delete('sslmode');
    url.searchParams.delete('ssl');
    url.searchParams.delete('uselibpqcompat');
    // Node `pg` does not support libpq channel_binding; Neon may send it in dashboard URLs.
    url.searchParams.delete('channel_binding');
  }

  return {
    connectionString: url.toString(),
    ...(wantsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool =
    globalForPrisma.pgPool ?? new Pool(buildPgPoolConfig(connectionString));

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pgPool = pool;
  }

  const adapter = new PrismaPg(pool);

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
      void globalForPrisma.pgPool?.end().catch(() => undefined);
      globalForPrisma.prisma = undefined;
      globalForPrisma.pgPool = undefined;
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
