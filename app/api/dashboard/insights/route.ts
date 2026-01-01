import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

const CACHE_SECONDS = 30;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function getBaseUrlFromEnv(): string {
    const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) return appUrl.replace(/\/$/, "");

    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) return `https://${vercelUrl}`;

    return "http://localhost:3000";
}

type Conversation = {
    id: number;
    participant?: string;
    wa_id?: string;
    last_message?: {
        created_at?: string;
        direction?: string;
        payload?: unknown;
    };
};

type Envelope<T> = {
    data?: T;
    meta?: Record<string, unknown>;
    error?: unknown;
};

function readNumber(v: unknown): number | null {
    return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function batch<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
}

async function fetchJson<T>(url: string, cookieHeader: string | null): Promise<Envelope<T>> {
    const res = await fetch(url, {
        next: { revalidate: CACHE_SECONDS },
        headers: {
            accept: "application/json",
            ...(cookieHeader ? { cookie: cookieHeader } : {}),
        },
    });

    const contentType = res.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
        ? ((await res.json().catch(() => null)) as unknown)
        : ((await res.text().catch(() => null)) as unknown);

    if (!res.ok) {
        return {
            error: isRecord(body) ? body.error ?? body : body,
        };
    }

    return (body ?? {}) as Envelope<T>;
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) {
        return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }

    const cookieHeader = req.headers.get("cookie");
    const baseUrl = getBaseUrlFromEnv();

    // Fetch all conversations with pagination (bounded).
    const limit = 200;
    const maxPages = 10; // hard cap to avoid runaway requests

    let allConversations: Conversation[] = [];
    let offset = 0;
    let totalFromMeta: number | null = null;

    for (let page = 0; page < maxPages; page++) {
        const url = `${baseUrl}/api/sessions?limit=${limit}&offset=${offset}`;
        const payload = await fetchJson<Conversation[]>(url, cookieHeader);

        const items = Array.isArray(payload.data) ? payload.data : [];
        allConversations = allConversations.concat(items);

        if (payload.meta && totalFromMeta === null) {
            const t = readNumber(payload.meta.total);
            if (t !== null) totalFromMeta = t;
        }

        if (items.length < limit) break;
        offset += limit;

        if (totalFromMeta !== null && allConversations.length >= totalFromMeta) break;
    }

    // Safety cap.
    if (allConversations.length > 500) {
        allConversations = allConversations.slice(0, 500);
    }

    const conversationIds = allConversations
        .map((c) => c?.id)
        .filter((id): id is number => typeof id === "number" && Number.isFinite(id));

    // Aggregate total message counts using /api/sessions/[id]?limit=1 and meta.total.
    const perConversationMessageCount = new Map<number, number>();
    const batchSize = 10;

    for (const ids of batch(conversationIds, batchSize)) {
        const results = await Promise.all(
            ids.map(async (id) => {
                const url = `${baseUrl}/api/sessions/${id}?limit=1&offset=0`;
                const payload = await fetchJson<unknown[]>(url, cookieHeader);
                const total = payload.meta ? readNumber(payload.meta.total) : null;
                return { id, total };
            })
        );

        for (const r of results) {
            if (r.total !== null) perConversationMessageCount.set(r.id, r.total);
        }
    }

    const conversationsTotal = totalFromMeta ?? allConversations.length;
    const conversationsFetched = allConversations.length;
    const conversationsWithCounts = perConversationMessageCount.size;

    const messagesTotal = Array.from(perConversationMessageCount.values()).reduce(
        (acc, n) => acc + n,
        0
    );

    let mostActiveConversationId: number | null = null;
    let mostActiveConversationMessages = 0;
    for (const [id, count] of perConversationMessageCount.entries()) {
        if (count > mostActiveConversationMessages) {
            mostActiveConversationMessages = count;
            mostActiveConversationId = id;
        }
    }

    const lastActivityIso = allConversations
        .map((c) => c?.last_message?.created_at)
        .filter((v): v is string => typeof v === "string")
        .sort()
        .at(-1);

    const activeConversations = Array.from(perConversationMessageCount.values()).filter(
        (n) => n > 0
    ).length;

    const response = NextResponse.json({
        data: {
            conversationsTotal,
            conversationsFetched,
            conversationsWithCounts,
            messagesTotal,
            activeConversations,
            mostActiveConversationId,
            mostActiveConversationMessages,
            lastActivityIso: lastActivityIso ?? null,
            generatedAt: new Date().toISOString(),
        },
    });

    response.headers.set(
        "Cache-Control",
        `private, max-age=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 2}`
    );
    response.headers.set("Vary", "Cookie");
    return response;
}
