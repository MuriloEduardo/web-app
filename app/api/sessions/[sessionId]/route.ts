import { NextResponse } from "next/server";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

type Message = {
    conversation_id?: number;
};

export async function GET(
    req: Request,
    { params }: { params: Promise<{ sessionId: string }> }
) {
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

    const res = await fetch(`${baseUrl}/messages?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`, {
        cache: "no-store",
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

    const filtered = Array.isArray(items)
        ? items.filter((m) => m?.conversation_id === numericSessionId)
        : [];

    return NextResponse.json({
        data: filtered,
        meta: {
            total: isRecord(body) && typeof body.total === "number" ? body.total : undefined,
            limit: isRecord(body) && typeof body.limit === "number" ? body.limit : undefined,
            offset: isRecord(body) && typeof body.offset === "number" ? body.offset : undefined,
        },
    });
}
