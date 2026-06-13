import { PrismaClient, Prisma } from '@prisma/client'

// Helper to safely cast any object to Prisma's Json input type
export function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env['NODE_ENV'] === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma
}
