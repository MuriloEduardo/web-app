import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/app/lib/auth";

export const runtime = "nodejs";

const handler = NextAuth(authOptions);

type NextAuthAppRouteHandler = (
    req: NextRequest,
    ctx: Record<string, unknown>,
) => Promise<Response>;

const routeHandler = handler as unknown as NextAuthAppRouteHandler;

function secretMissingInProd() {
    return process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_SECRET;
}

export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ nextauth: string[] }> },
) {
    if (secretMissingInProd()) {
        return NextResponse.json(
            { ok: false, error: "NEXTAUTH_SECRET is required in production" },
            { status: 500 },
        );
    }

    const params = await ctx.params;
    const nextCtx = { ...(ctx as unknown as Record<string, unknown>), params };
    return routeHandler(req, nextCtx);
}

export async function POST(
    req: NextRequest,
    ctx: { params: Promise<{ nextauth: string[] }> },
) {
    if (secretMissingInProd()) {
        return NextResponse.json(
            { ok: false, error: "NEXTAUTH_SECRET is required in production" },
            { status: 500 },
        );
    }

    const params = await ctx.params;
    const nextCtx = { ...(ctx as unknown as Record<string, unknown>), params };
    return routeHandler(req, nextCtx);
}
