/**
 * Upload local storage/ebooks/*.pdf to Vercel Blob and update Neon Ebook.storageKey.
 *
 * Prerequisites:
 *   1. BLOB_READ_WRITE_TOKEN in .env
 *   2. From web/: npm run db:sync-ebooks:blob
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { readFile, readdir } from 'node:fs/promises';

// Load env BEFORE importing Prisma/db (imports are otherwise hoisted first).
config({ path: resolve(process.cwd(), '.env') });

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!token) {
    console.error('Missing BLOB_READ_WRITE_TOKEN in .env');
    process.exit(1);
  }
  if (!databaseUrl) {
    console.error('Missing DATABASE_URL / DIRECT_URL in .env');
    process.exit(1);
  }

  const { put } = await import('@vercel/blob');
  const { PrismaClient } = await import('@prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const { Pool } = await import('pg');
  const { buildPgPoolConfig } = await import('../lib/db');

  const pool = new Pool(buildPgPoolConfig(databaseUrl));
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const dir = resolve(process.cwd(), 'storage/ebooks');
    const files = (await readdir(dir)).filter((f) => f.toLowerCase().endsWith('.pdf'));
    if (files.length === 0) {
      console.error(`No PDFs in ${dir}`);
      process.exit(1);
    }

    for (const fileName of files) {
      const id = fileName.replace(/\.pdf$/i, '');
      const ebook = await prisma.ebook.findFirst({ where: { id } });
      if (!ebook) {
        console.warn(`Skip ${fileName}: no Ebook row with id=${id}`);
        continue;
      }

      const bytes = await readFile(resolve(dir, fileName));
      console.log(`Uploading ${fileName} (${bytes.length} bytes)…`);
      const blob = await put(`ebooks/${fileName}`, bytes, {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/pdf',
        token,
      });

      await prisma.ebook.update({
        where: { id: ebook.id },
        data: { storageKey: blob.url },
      });
      console.log(`  → ${blob.url}`);
    }

    const rows = await prisma.ebook.findMany({
      select: { id: true, title: true, storageKey: true },
    });
    console.log('\nEbook storage keys:');
    for (const row of rows) {
      console.log(`- ${row.title}: ${row.storageKey}`);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
