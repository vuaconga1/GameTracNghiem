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

function hasCourseField(client: unknown, field: string): boolean {
  const models = (
    client as {
      _runtimeDataModel?: { models?: Record<string, { fields?: Record<string, unknown> }> };
    }
  )._runtimeDataModel?.models;
  const fields = models?.Course?.fields;
  return Boolean(fields && field in fields);
}

/** Dev-only: drop a stale HMR Prisma client without ending the shared pg pool. */
export function shouldRecycleDevClient(client: unknown): boolean {
  return !hasCourseField(client, 'enabledGames');
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool =
    globalForPrisma.pgPool ?? new Pool(buildPgPoolConfig(connectionString));

  // Keep one pool for the whole Node process (dev HMR + serverless warm instances).
  globalForPrisma.pgPool = pool;

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

function getPrismaClient(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing) {
    // After `prisma generate`, Next HMR can keep a stale Prisma client.
    // Recycle the client only — never $disconnect()/pool.end(): with PrismaPg,
    // $disconnect ends the underlying Pool and other hot-reloaded modules still
    // holding a client throw "Cannot use a pool after calling end on the pool".
    if (process.env.NODE_ENV !== 'production' && shouldRecycleDevClient(existing)) {
      globalForPrisma.prisma = undefined;
    } else {
      return existing;
    }
  }

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  return client;
}

/**
 * Lazy accessor so HMR always reads the current global client/pool instead of a
 * closed-over module binding from a previous hot reload.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
