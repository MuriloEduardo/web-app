import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

async function getCookieHeader(): Promise<string> {
    const h = await headers();
    return h.get("cookie") ?? "";
}

function getBaseUrlFromEnv(): string {
    const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) return appUrl.replace(/\/$/, "");

    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) return `https://${vercelUrl}`;

    return "http://localhost:3000";
}

type BffEnvelope<T> = {
    data?: T;
    meta?: {
        total?: number;
        limit?: number;
        offset?: number;
    };
    error?: {
        code?: string;
        details?: unknown;
    };
};

async function bffGet<T>(path: string): Promise<BffEnvelope<T>> {
    const cookie = await getCookieHeader();

    const res = await fetch(`${getBaseUrlFromEnv()}${path}`, {
        cache: "no-store",
        headers: {
            ...(cookie ? { cookie } : {}),
            accept: "application/json",
        },
    });

    const payload = (await res.json().catch(() => null)) as unknown;
    return (isRecord(payload) ? payload : {}) as BffEnvelope<T>;
}

type Conversation = {
    id: number;
    wa_id?: string;
    participant?: string;
    last_message?: {
        created_at?: string;
        direction?: string;
    };
};

function parseIsoDate(value: string | undefined): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d : null;
}

async function getAllConversations(): Promise<Conversation[]> {
    const limit = 100;
    let offset = 0;

    const all: Conversation[] = [];
    for (let page = 0; page < 50; page++) {
        const env = await bffGet<unknown[]>(`/api/sessions?limit=${limit}&offset=${offset}`);
        const items = Array.isArray(env.data) ? env.data : [];

        const parsed: Conversation[] = items
            .map((c) => {
                if (!isRecord(c)) return null;
                if (typeof c.id !== "number") return null;

                const lastMessageRaw = c.last_message;
                const last_message = isRecord(lastMessageRaw)
                    ? {
                        created_at:
                            typeof lastMessageRaw.created_at === "string"
                                ? lastMessageRaw.created_at
                                : undefined,
                        direction:
                            typeof lastMessageRaw.direction === "string"
                                ? lastMessageRaw.direction
                                : undefined,
                    }
                    : undefined;

                return {
                    id: c.id,
                    wa_id: typeof c.wa_id === "string" ? c.wa_id : undefined,
                    participant: typeof c.participant === "string" ? c.participant : undefined,
                    last_message,
                } satisfies Conversation;
            })
            .filter((v): v is Conversation => v !== null);

        all.push(...parsed);

        const total = typeof env.meta?.total === "number" ? env.meta.total : null;

        offset += limit;
        if (parsed.length < limit) break;
        if (total !== null && offset >= total) break;
    }

    return all;
}

async function getConversationMessageTotal(conversationId: number): Promise<number> {
    const env = await bffGet<unknown[]>(`/api/sessions/${conversationId}?limit=1&offset=0`);
    return typeof env.meta?.total === "number" ? env.meta.total : 0;
}

async function mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    fn: (item: T) => Promise<R>
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let nextIndex = 0;

    async function worker() {
        while (true) {
            const idx = nextIndex;
            nextIndex++;
            if (idx >= items.length) return;
            results[idx] = await fn(items[idx]);
        }
    }

    const workers = Array.from(
        { length: Math.max(1, Math.min(concurrency, items.length)) },
        () => worker()
    );

    await Promise.all(workers);
    return results;
}

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) redirect("/login");

    const conversations = await getAllConversations();

    const messageTotals = await mapWithConcurrency(
        conversations,
        8,
        async (c) => await getConversationMessageTotal(c.id)
    );

    const totalMessages = messageTotals.reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0);
    const totalConversations = conversations.length;

    const now = Date.now();
    const last24hMs = 24 * 60 * 60 * 1000;
    const activeLast24h = conversations.filter((c) => {
        const d = parseIsoDate(c.last_message?.created_at);
        return d ? now - d.getTime() <= last24hMs : false;
    }).length;

    let lastActivity: Date | null = null;
    let lastDirectionInbound = 0;
    let lastDirectionOutbound = 0;
    for (const c of conversations) {
        const d = parseIsoDate(c.last_message?.created_at);
        if (d && (!lastActivity || d.getTime() > lastActivity.getTime())) {
            lastActivity = d;
        }

        const dir = c.last_message?.direction;
        if (dir === "inbound") lastDirectionInbound++;
        if (dir === "outbound") lastDirectionOutbound++;
    }

    const nf = new Intl.NumberFormat("pt-BR");

    return (
        <div className="flex min-h-screen items-center justify-center font-sans dark:bg-gray-900">
            <main className="w-full max-w-3xl rounded bg-white p-6 dark:bg-gray-900 dark:text-white">
                <h1 className="text-lg font-semibold">Bem-vindo!</h1>
                <p className="mt-2 text-sm">
                    Você está logado como <b>{session?.user?.email}</b>
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded border p-3 dark:border-gray-800">
                        <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Conversas
                        </div>
                        <div className="mt-1 text-2xl font-semibold">
                            {nf.format(totalConversations)}
                        </div>
                    </div>

                    <div className="rounded border p-3 dark:border-gray-800">
                        <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Mensagens (total)
                        </div>
                        <div className="mt-1 text-2xl font-semibold">
                            {nf.format(totalMessages)}
                        </div>
                    </div>

                    <div className="rounded border p-3 dark:border-gray-800">
                        <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Conversas ativas (24h)
                        </div>
                        <div className="mt-1 text-2xl font-semibold">
                            {nf.format(activeLast24h)}
                        </div>
                    </div>

                    <div className="rounded border p-3 dark:border-gray-800">
                        <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Última atividade
                        </div>
                        <div className="mt-1 text-sm">
                            {lastActivity
                                ? lastActivity.toLocaleString("pt-BR")
                                : "—"}
                        </div>
                        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                            Última direção: inbound {nf.format(lastDirectionInbound)} | outbound {nf.format(lastDirectionOutbound)}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
