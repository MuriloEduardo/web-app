import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

type Conversation = {
    id?: number;
    company_number?: string;
    wa_id?: string;
    participant?: string;
    last_message?: unknown;
    created_at?: string;
    updated_at?: string;
};

export async function GET(req: Request) {
    const baseUrl = process.env.COMMUNICATIONS_WEB_URL?.replace(/\/$/, "");

    if (!baseUrl) {
        return NextResponse.json(
            { error: { code: "COMMUNICATIONS_WEB_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }

    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();

    if (!email) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED" } },
            { status: 401 }
        );
    }

    const url = new URL(req.url);
    const limit = url.searchParams.get("limit") ?? "50";
    const offset = url.searchParams.get("offset") ?? "0";

    const company_number_from_query = url.searchParams.get("company_number")?.trim() || null;

    const user = await prisma.user.findUnique({
        where: { email },
        select: { phone_number: true },
    });

    const userCompanyNumber = user?.phone_number?.trim() || null;
    if (!userCompanyNumber) {
        return NextResponse.json(
            { error: { code: "COMPANY_NUMBER_REQUIRED" } },
            { status: 400 }
        );
    }

    if (company_number_from_query && company_number_from_query !== userCompanyNumber) {
        return NextResponse.json(
            { error: { code: "FORBIDDEN_COMPANY_NUMBER" } },
            { status: 403 }
        );
    }

    const company_number = userCompanyNumber;

    const query = new URLSearchParams();
    query.set("company_number", company_number);
    query.set("limit", limit);
    query.set("offset", offset);

    let res: Response;
    try {
        res = await fetch(`${baseUrl}/conversations?${query.toString()}`, {
            headers: { accept: "application/json" },
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: {
                    code: "CONVERSATIONS_FETCH_FAILED",
                    details: error instanceof Error ? error.message : error,
                },
            },
            { status: 502 }
        );
    }

    const contentType = res.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
        ? await res.json()
        : await res.text();

    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "CONVERSATIONS_FETCH_FAILED", details: body } },
            { status: res.status }
        );
    }

    const conversations =
        isRecord(body) && Array.isArray(body.items)
            ? (body.items as Conversation[])
            : Array.isArray(body)
                ? (body as Conversation[])
                : [];

    // Sort desc by conversation id if present
    conversations.sort((a, b) => (b?.id ?? 0) - (a?.id ?? 0));

    return NextResponse.json({
        data: conversations,
        meta: {
            total: isRecord(body) && typeof body.total === "number" ? body.total : undefined,
            limit: isRecord(body) && typeof body.limit === "number" ? body.limit : undefined,
            offset: isRecord(body) && typeof body.offset === "number" ? body.offset : undefined,
        },
    });
}
