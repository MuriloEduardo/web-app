import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const prismaClientSingleton = () => {
    const accelerateUrl = process.env.DATABASE_PRISMA_DATABASE_URL;

    return new PrismaClient(
        accelerateUrl ? { accelerateUrl } : undefined,
    ).$extends(withAccelerate());
};

type PrismaClientType = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClientType;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
