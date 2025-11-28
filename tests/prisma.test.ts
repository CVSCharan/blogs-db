import { getPrismaClient, disconnectPrisma } from '../src/prisma/client';

describe('Prisma Client', () => {
  afterAll(async () => {
    await disconnectPrisma();
  });

  it('should create a Prisma client instance', () => {
    const prisma = getPrismaClient();
    expect(prisma).toBeDefined();
  });

  it('should return the same instance on multiple calls', () => {
    const prisma1 = getPrismaClient();
    const prisma2 = getPrismaClient();
    expect(prisma1).toBe(prisma2);
  });
});
