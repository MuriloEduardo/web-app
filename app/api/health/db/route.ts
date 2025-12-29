import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
    try {
        await prisma.$queryRaw(Prisma.sql`SELECT 1`);

        return NextResponse.json({ ok: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";

        return NextResponse.json(
            { ok: false, error: message },
            { status: 500 },
        );
    }
}
