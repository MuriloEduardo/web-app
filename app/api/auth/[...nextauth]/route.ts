import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/app/lib/auth";

export const runtime = "nodejs";

const handler = NextAuth(authOptions);

function secretMissingInProd() {
    return process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_SECRET;
}

export async function GET(req: NextRequest, ctx: { params: { nextauth: string[] } }) {
    if (secretMissingInProd()) {
        return NextResponse.json(
            { ok: false, error: "NEXTAUTH_SECRET is required in production" },
            { status: 500 },
        );
    }

    return (handler as any)(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: { nextauth: string[] } }) {
    if (secretMissingInProd()) {
        return NextResponse.json(
            { ok: false, error: "NEXTAUTH_SECRET is required in production" },
            { status: 500 },
        );
    }

    return (handler as any)(req, ctx);
}
