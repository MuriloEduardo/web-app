import { ConversasList } from "./ConversasList";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

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

function parseJsonIfString(value: unknown): unknown {
    if (typeof value !== "string") return value;
    try {
        return JSON.parse(value) as unknown;
    } catch {
        return value;
    }
}

function isLikelyPhoneOrWaId(value: string | undefined): boolean {
    if (!value) return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    return /^\d{6,}$/.test(trimmed);
}

type WhatsAppConversationContext = {
    contactName?: string;
    contactWaId?: string;
};

function extractWhatsAppConversationContext(payload: unknown): WhatsAppConversationContext | null {
    payload = parseJsonIfString(payload);
    if (!isRecord(payload)) return null;

    const entry = payload.entry;
    if (!Array.isArray(entry) || !isRecord(entry[0])) return null;

    const changes = entry[0].changes;
    if (!Array.isArray(changes) || !isRecord(changes[0])) return null;

    const value = changes[0].value;
    if (!isRecord(value)) return null;

    const contacts = value.contacts;
    const messages = value.messages;

    const ctx: WhatsAppConversationContext = {};

    const firstContact: unknown = Array.isArray(contacts)
        ? contacts[0]
        : isRecord(contacts)
            ? contacts
            : null;

    if (isRecord(firstContact)) {
        const waId = firstContact.wa_id;
        if (typeof waId === "string") ctx.contactWaId = waId;

        const profile = firstContact.profile;
        if (isRecord(profile) && typeof profile.name === "string") {
            ctx.contactName = profile.name;
        }
    }

    if (!ctx.contactWaId && Array.isArray(messages) && isRecord(messages[0])) {
        const from = messages[0].from;
        const to = messages[0].to;
        if (typeof from === "string") ctx.contactWaId = from;
        else if (typeof to === "string") ctx.contactWaId = to;
    }

    return ctx.contactName || ctx.contactWaId ? ctx : null;
}

function pickBestWhatsAppContext(
    contexts: WhatsAppConversationContext[]
): WhatsAppConversationContext | undefined {
    let best: WhatsAppConversationContext | undefined;
    let bestScore = -1;

    for (const ctx of contexts) {
        const score = (ctx.contactName ? 100 : 0) + (ctx.contactWaId ? 50 : 0);
        if (score > bestScore) {
            bestScore = score;
            best = ctx;
        }
    }

    return best;
}

type Conversation = {
    id: number;
    participant?: string;
    wa_id?: string;
    last_message?: {
        payload?: unknown;
        created_at?: string;
        direction?: string;
        status?: unknown;
        statuses?: unknown;
    };
    last_message_text?: string;
    last_message_status?: string | null;
    last_message_direction?: string;
};

type CommunicationsMessage = {
    payload?: unknown;
};

function extractWhatsAppText(payload: unknown): string | null {
    payload = parseJsonIfString(payload);
    if (!isRecord(payload)) return null;

    const entry = payload.entry;
    if (!Array.isArray(entry) || !isRecord(entry[0])) return null;

    const changes = entry[0].changes;
    if (!Array.isArray(changes) || !isRecord(changes[0])) return null;

    const value = changes[0].value;
    if (!isRecord(value)) return null;

    const messages = value.messages;
    if (!Array.isArray(messages) || !isRecord(messages[0])) return null;

    const text = messages[0].text;
    if (!isRecord(text)) return null;

    const body = text.body;
    return typeof body === "string" ? body : null;
}

function extractWhatsAppStatus(payload: unknown): string | null {
    payload = parseJsonIfString(payload);
    if (!isRecord(payload)) return null;

    const entry = payload.entry;
    if (!Array.isArray(entry) || !isRecord(entry[0])) return null;

    const changes = entry[0].changes;
    if (!Array.isArray(changes) || !isRecord(changes[0])) return null;

    const value = changes[0].value;
    if (!isRecord(value)) return null;

    const statuses = value.statuses;
    if (!Array.isArray(statuses) || !isRecord(statuses[0])) return null;

    const status = statuses[0].status;
    return typeof status === "string" ? status : null;
}

function pickLatestStatusFromStatuses(statuses: unknown): string | null {
    if (!Array.isArray(statuses) || statuses.length === 0) return null;

    const items = statuses.filter((s): s is Record<string, unknown> => isRecord(s));
    if (items.length === 0) return null;

    function statusRank(status: string): number {
        const s = status.trim().toLowerCase();
        if (s === "read" || s.startsWith("read_")) return 3;
        if (s === "delivered" || s.startsWith("delivered_")) return 2;
        if (s === "sent") return 1;
        return 0;
    }

    function toEpochMs(value: unknown): number | null {
        if (typeof value === "number" && Number.isFinite(value)) {
            return value > 1_000_000_000_000 ? value : value * 1000;
        }
        if (typeof value === "string") {
            const trimmed = value.trim();
            if (!/^\d+$/.test(trimmed)) return null;
            const n = Number(trimmed);
            if (!Number.isFinite(n)) return null;
            return n > 1_000_000_000_000 ? n : n * 1000;
        }
        return null;
    }

    function parseCreatedAtMs(value: unknown): number | null {
        if (typeof value !== "string") return null;
        const normalized = value.replace(/(\.\d{3})\d+/, "$1");
        const ms = Date.parse(normalized);
        return Number.isFinite(ms) ? ms : null;
    }

    function getSortTimeMs(s: Record<string, unknown>): number | null {
        return toEpochMs(s.timestamp) ?? parseCreatedAtMs(s.created_at);
    }

    let best: { status: string; timeMs: number | null; createdAtMs: number | null; rank: number; index: number } | null = null;

    for (let index = 0; index < items.length; index++) {
        const s = items[index];
        const status = typeof s.status === "string" ? s.status : null;
        if (!status) continue;

        const timeMs = getSortTimeMs(s);
        const createdAtMs = parseCreatedAtMs(s.created_at);
        const rank = statusRank(status);

        const candidate = { status, timeMs, createdAtMs, rank, index };

        if (!best) {
            best = candidate;
            continue;
        }

        const aTime = best.timeMs;
        const bTime = candidate.timeMs;
        if (typeof bTime === "number" && (typeof aTime !== "number" || bTime > aTime)) {
            best = candidate;
            continue;
        }
        if (typeof aTime === "number" && typeof bTime === "number" && bTime < aTime) continue;

        const aCreated = best.createdAtMs;
        const bCreated = candidate.createdAtMs;
        if (typeof bCreated === "number" && (typeof aCreated !== "number" || bCreated > aCreated)) {
            best = candidate;
            continue;
        }
        if (typeof aCreated === "number" && typeof bCreated === "number" && bCreated < aCreated) continue;

        if (candidate.rank > best.rank) {
            best = candidate;
            continue;
        }
        if (candidate.rank < best.rank) continue;

        if (candidate.index > best.index) {
            best = candidate;
        }
    }

    return best?.status ?? null;
}

async function getConversations(): Promise<Conversation[]> {
    const cookie = await getCookieHeader();
    const res = await fetch(`${getBaseUrlFromEnv()}/api/sessions`, {
        cache: "no-store",
        headers: {
            ...(cookie ? { cookie } : {}),
        },
    });

    if (!res.ok) return [];

    const json = (await res.json()) as { data?: unknown };

    const items = Array.isArray(json.data) ? (json.data as unknown[]) : [];
    return items
        .map((c) => {
            if (!isRecord(c)) return null;
            if (typeof c.id !== "number") return null;

            const lastMessageRaw = c.last_message;
            const lastMessage = isRecord(lastMessageRaw)
                ? {
                    payload: lastMessageRaw.payload,
                    created_at:
                        typeof lastMessageRaw.created_at === "string"
                            ? lastMessageRaw.created_at
                            : undefined,
                    direction:
                        typeof lastMessageRaw.direction === "string"
                            ? lastMessageRaw.direction
                            : undefined,
                    status: lastMessageRaw.status,
                    statuses: lastMessageRaw.statuses,
                }
                : undefined;

            const lastMessageText = lastMessage
                ? extractWhatsAppText(lastMessage.payload) ?? undefined
                : undefined;

            const lastMessageDirection = lastMessage?.direction;
            const lastMessageStatus =
                pickLatestStatusFromStatuses(lastMessage?.statuses) ??
                (typeof lastMessage?.status === "string" ? lastMessage.status : null) ??
                (lastMessage?.payload ? extractWhatsAppStatus(lastMessage.payload) : null);

            const conversation: Conversation = {
                id: c.id,
                participant: typeof c.participant === "string" ? c.participant : undefined,
                wa_id: typeof c.wa_id === "string" ? c.wa_id : undefined,
                last_message: lastMessage,
                last_message_text: lastMessageText,
                last_message_status: lastMessageStatus,
                last_message_direction: lastMessageDirection,
            };

            return conversation;
        })
        .filter((v): v is Conversation => v !== null);
}

async function requireLogin() {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) redirect("/login");
    return email;
}

async function getMessagesForConversation(conversationId: number): Promise<CommunicationsMessage[]> {
    const cookie = await getCookieHeader();
    const res = await fetch(
        `${getBaseUrlFromEnv()}/api/sessions/${conversationId}?limit=20`,
        {
            cache: "no-store",
            headers: {
                ...(cookie ? { cookie } : {}),
            },
        }
    );

    if (!res.ok) return [];

    const json = (await res.json()) as { data?: unknown };
    return Array.isArray(json.data) ? (json.data as CommunicationsMessage[]) : [];
}

export default async function ConversasPage() {
    await requireLogin();
    const conversations = await getConversations();

    const enriched = await Promise.all(
        conversations.map(async (c) => {
            const participant = c.participant;
            const participantIsNumber = isLikelyPhoneOrWaId(participant);
            const participantEqualsWa =
                participant && c.wa_id ? participant.trim() === c.wa_id.trim() : false;

            const needsName = !participant || participant.trim().length === 0 || participantIsNumber || participantEqualsWa;

            if (!needsName) return c;

            const ctxFromLast = c.last_message?.payload
                ? extractWhatsAppConversationContext(c.last_message.payload)
                : null;
            const inferredNameFromLast = ctxFromLast?.contactName;
            if (inferredNameFromLast) {
                return {
                    ...c,
                    participant: inferredNameFromLast,
                };
            }

            const messages = await getMessagesForConversation(c.id);
            const ctx = pickBestWhatsAppContext(
                messages
                    .map((m) => extractWhatsAppConversationContext(m.payload))
                    .filter((v): v is WhatsAppConversationContext => v !== null)
            );

            const inferredName = ctx?.contactName;
            if (!inferredName) return c;

            return {
                ...c,
                participant: inferredName,
            };
        })
    );

    return (
        <main className="min-h-screen w-full dark:bg-gray-900">
            <div className="flex items-center justify-between p-2">
                <h1 className="text-xl font-semibold dark:text-white">
                    Conversas
                </h1>
            </div>

            <ConversasList conversations={enriched} />
        </main>
    );
}
