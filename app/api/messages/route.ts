import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
        return NextResponse.json(
            { error: { code: "UNAUTHORIZED" } },
            { status: 401 }
        );
    }

    const baseUrl = process.env.COMMUNICATIONS_WEB_URL?.replace(/\/$/, "");

    if (!baseUrl) {
        return NextResponse.json(
            {
                error: {
                    code: "COMMUNICATIONS_WEB_URL_NOT_CONFIGURED",
                },
            },
            { status: 500 }
        );
    }

    const url = new URL(req.url);
    const limit = url.searchParams.get("limit") ?? "50";
    const offset = url.searchParams.get("offset") ?? "0";
    const conversationId = url.searchParams.get("conversation_id");

    const query = new URLSearchParams();
    query.set("limit", limit);
    query.set("offset", offset);
    if (conversationId) query.set("conversation_id", conversationId);

    const res = await fetch(`${baseUrl}/messages?${query.toString()}`, {
        headers: {
            accept: "application/json",
        },
    });

    const contentType = res.headers.get("content-type") ?? "";
    const responseBody = contentType.includes("application/json")
        ? await res.json()
        : await res.text();

    if (!res.ok) {
        return NextResponse.json(
            {
                error: {
                    code: "MESSAGES_FETCH_FAILED",
                    details: responseBody,
                },
            },
            { status: res.status }
        );
    }

    const items =
        isRecord(responseBody) && Array.isArray(responseBody.items)
            ? responseBody.items
            : Array.isArray(responseBody)
                ? responseBody
                : [];

    const total = isRecord(responseBody) && typeof responseBody.total === "number" ? responseBody.total : undefined;
    const metaLimit = isRecord(responseBody) && typeof responseBody.limit === "number" ? responseBody.limit : undefined;
    const metaOffset = isRecord(responseBody) && typeof responseBody.offset === "number" ? responseBody.offset : undefined;

    return NextResponse.json({
        data: items,
        meta: { total, limit: metaLimit, offset: metaOffset },
    });
}
