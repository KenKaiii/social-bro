import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  return new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

function createPrismaClient(): PrismaClient {
  if (!globalForPrisma.pool) {
    globalForPrisma.pool = createPool();

    // Handle pool errors gracefully - reconnect on error
    globalForPrisma.pool.on('error', (err) => {
      console.error('Postgres pool error:', err.message);
      // Pool will automatically recreate connections
    });
  }

  const adapter = new PrismaPg(globalForPrisma.pool);

  return new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
