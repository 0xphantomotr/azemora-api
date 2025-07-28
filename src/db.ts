import { PrismaClient } from '@prisma/client';

// This is a best practice to prevent creating too many connections to the database
// in a serverless or hot-reloading environment.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'], // Log every query to the console for debugging
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma; 