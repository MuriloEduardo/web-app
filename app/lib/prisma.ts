import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const prismaClientSingleton = (): PrismaClient => {
    const accelerateUrl = process.env.DATABASE_PRISMA_DATABASE_URL;

    const client = new PrismaClient(accelerateUrl ? { accelerateUrl } : undefined);

    // Prisma v7 + extensions can result in a "dynamic" client type that hides model delegates.
    // Runtime still works; we keep the stable PrismaClient typing for app code.
    return client.$extends(withAccelerate()) as unknown as PrismaClient;
};

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
};

export const prisma: PrismaClient = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
