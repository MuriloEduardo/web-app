import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

type Message = unknown;

export async function GET(
    req: Request,
    { params }: { params: Promise<{ sessionId: string }> }
) {
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
            { error: { code: "COMMUNICATIONS_WEB_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }

    const { sessionId } = await params;
    const numericSessionId = Number(sessionId);

    if (!Number.isFinite(numericSessionId)) {
        return NextResponse.json(
            { error: { code: "INVALID_CONVERSATION_ID" } },
            { status: 400 }
        );
    }

    const url = new URL(req.url);
    const limit = url.searchParams.get("limit") ?? "50";
    const offset = url.searchParams.get("offset") ?? "0";

    const query = new URLSearchParams();
    query.set("conversation_id", String(numericSessionId));
    query.set("limit", limit);
    query.set("offset", offset);

    const res = await fetch(`${baseUrl}/messages?${query.toString()}`, {
        headers: { accept: "application/json" },
    });

    const contentType = res.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
        ? await res.json()
        : await res.text();

    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "MESSAGES_FETCH_FAILED", details: body } },
            { status: res.status }
        );
    }

    const items =
        isRecord(body) && Array.isArray(body.items)
            ? (body.items as Message[])
            : Array.isArray(body)
                ? (body as Message[])
                : [];

    return NextResponse.json({
        data: items,
        meta: {
            total: isRecord(body) && typeof body.total === "number" ? body.total : undefined,
            limit: isRecord(body) && typeof body.limit === "number" ? body.limit : undefined,
            offset: isRecord(body) && typeof body.offset === "number" ? body.offset : undefined,
        },
    });
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ sessionId: string }> }
) {
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
            { error: { code: "COMMUNICATIONS_WEB_URL_NOT_CONFIGURED" } },
            { status: 500 }
        );
    }

    const { sessionId } = await params;
    const numericSessionId = Number(sessionId);

    if (!Number.isFinite(numericSessionId)) {
        return NextResponse.json(
            { error: { code: "INVALID_CONVERSATION_ID" } },
            { status: 400 }
        );
    }

    const payload = (await req.json().catch(() => null)) as unknown;
    if (!isRecord(payload) || typeof payload.skips_forwarding !== "boolean") {
        return NextResponse.json(
            { error: { code: "INVALID_BODY" } },
            { status: 400 }
        );
    }

    const res = await fetch(`${baseUrl}/conversations/${numericSessionId}`, {
        method: "PATCH",
        headers: {
            accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ skips_forwarding: payload.skips_forwarding }),
    });

    const contentType = res.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
        ? await res.json()
        : await res.text();

    if (!res.ok) {
        return NextResponse.json(
            { error: { code: "CONVERSATION_PATCH_FAILED", details: body } },
            { status: res.status }
        );
    }

    return NextResponse.json({ data: body });
}
