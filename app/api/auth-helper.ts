import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";

export async function getAuthenticatedEmail(request: NextRequest): Promise<string | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return null;
    }
    return session.user.email;
}

export async function requireAuth(request: NextRequest): Promise<string | NextResponse> {
    const email = await getAuthenticatedEmail(request);
    if (!email) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED" } },
            { status: 401 }
        );
    }
    return email;
}
