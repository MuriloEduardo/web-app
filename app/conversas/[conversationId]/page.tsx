import Link from "next/link";
import {
    ChevronLeftIcon,
} from "@heroicons/react/24/solid";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/app/lib/auth";
import { ConversationThreadClient } from "./ConversationThreadClient";

export const dynamic = "force-dynamic";

async function requireLogin() {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    if (!email) redirect("/login");
    return email;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
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

type Conversation = {
    id: number;
    participant?: string;
    wa_id?: string;
    company_number?: string;
    created_at?: string;
    updated_at?: string;
};

type CommunicationsMessage = {
    id?: number;
    conversation_id?: number;
    direction?: string;
    source?: string;
    target?: string;
    status?: unknown;
    statuses?: unknown;
    payload?: unknown;
    created_at?: string;
};

type WhatsAppConversationContext = {
    displayPhoneNumber?: string;
    phoneNumberId?: string;
    contactName?: string;
    contactWaId?: string;
};

function pickBestWhatsAppContext(
    contexts: WhatsAppConversationContext[]
): WhatsAppConversationContext | undefined {
    // Prefer contexts that contain the contact name (profile.name), then wa_id, then metadata.
    let best: WhatsAppConversationContext | undefined;
    let bestScore = -1;

    for (const ctx of contexts) {
        const score =
            (ctx.contactName ? 100 : 0) +
            (ctx.contactWaId ? 50 : 0) +
            (ctx.phoneNumberId ? 10 : 0) +
            (ctx.displayPhoneNumber ? 5 : 0);

        if (score > bestScore) {
            bestScore = score;
            best = ctx;
        }
    }

    return best;
}

type PageProps = {
    params: Promise<{ conversationId: string }>;
};

function getBaseUrlFromEnv(): string {
    const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) return appUrl.replace(/\/$/, "");

    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) return `https://${vercelUrl}`;

    return "http://localhost:3000";
}

async function getCookieHeader(): Promise<string> {
    const h = await headers();
    return h.get("cookie") ?? "";
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
    const data = Array.isArray(json.data) ? (json.data as unknown[]) : [];

    return data
        .map((c) => {
            if (!isRecord(c)) return null;
            if (typeof c.id !== "number") return null;

            const conversation: Conversation = {
                id: c.id,
                participant: typeof c.participant === "string" ? c.participant : undefined,
                wa_id: typeof c.wa_id === "string" ? c.wa_id : undefined,
                company_number:
                    typeof c.company_number === "string" ? c.company_number : undefined,
                created_at: typeof c.created_at === "string" ? c.created_at : undefined,
                updated_at: typeof c.updated_at === "string" ? c.updated_at : undefined,
            };

            return conversation;
        })
        .filter((v): v is Conversation => v !== null);
}

async function getMessages(conversationId: string): Promise<CommunicationsMessage[]> {
    const cookie = await getCookieHeader();
    const res = await fetch(`${getBaseUrlFromEnv()}/api/sessions/${conversationId}?limit=200`, {
        cache: "no-store",
        headers: {
            ...(cookie ? { cookie } : {}),
        },
    });

    if (!res.ok) return [];

    const json = (await res.json()) as { data?: unknown };
    return Array.isArray(json.data) ? (json.data as CommunicationsMessage[]) : [];
}

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
        // e.g. 2025-12-29T19:48:05.569276 -> truncate to ms
        const normalized = value.replace(/(\.\d{3})\d+/, "$1");
        const ms = Date.parse(normalized);
        return Number.isFinite(ms) ? ms : null;
    }

    function getSortTimeMs(s: Record<string, unknown>): number | null {
        // Use created_at for tie-break when timestamps are equal.
        return toEpochMs(s.timestamp) ?? parseCreatedAtMs(s.created_at);
    }

    // Iterate preserving order; choose max by:
    // 1) timeMs (timestamp/created_at)
    // 2) createdAtMs (secondary tie-break)
    // 3) status rank (read > delivered > sent)
    // 4) index (later wins)
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

function extractWhatsAppConversationContext(payload: unknown): WhatsAppConversationContext | null {
    payload = parseJsonIfString(payload);
    if (!isRecord(payload)) return null;

    const entry = payload.entry;
    if (!Array.isArray(entry) || !isRecord(entry[0])) return null;

    const changes = entry[0].changes;
    if (!Array.isArray(changes) || !isRecord(changes[0])) return null;

    const value = changes[0].value;
    if (!isRecord(value)) return null;

    const metadata = value.metadata;
    const contacts = value.contacts;
    const messages = value.messages;

    const ctx: WhatsAppConversationContext = {};

    if (isRecord(metadata)) {
        if (typeof metadata.display_phone_number === "string") {
            ctx.displayPhoneNumber = metadata.display_phone_number;
        }
        if (typeof metadata.phone_number_id === "string") {
            ctx.phoneNumberId = metadata.phone_number_id;
        }
    }

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

    // Fallback: some stored payloads may not include `contacts`, but `messages` often has `from`/`to`.
    if (!ctx.contactWaId && Array.isArray(messages) && isRecord(messages[0])) {
        const from = messages[0].from;
        const to = messages[0].to;
        if (typeof from === "string") ctx.contactWaId = from;
        else if (typeof to === "string") ctx.contactWaId = to;
    }

    const hasAny =
        Boolean(ctx.displayPhoneNumber) ||
        Boolean(ctx.phoneNumberId) ||
        Boolean(ctx.contactName) ||
        Boolean(ctx.contactWaId);

    return hasAny ? ctx : null;
}

function normalizeMessages(messages: CommunicationsMessage[]) {
    return messages.map((m, idx) => {
        const id =
            typeof m.id === "number"
                ? String(m.id)
                : `${m.conversation_id ?? "conv"}:${m.created_at ?? idx}`;

        const direction = typeof m.direction === "string" ? m.direction : "unknown";
        const text = extractWhatsAppText(m.payload) ?? "(mensagem sem texto)";
        const statusFromStatuses = pickLatestStatusFromStatuses(m.statuses);
        const statusFromField = typeof m.status === "string" ? m.status : null;
        const statusFromPayload = extractWhatsAppStatus(m.payload);
        const status = statusFromStatuses ?? statusFromField ?? statusFromPayload;

        const statuses = m.statuses;

        const createdAt =
            typeof m.created_at === "string"
                ? new Date(m.created_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                })
                : "";

        return { id, direction, text, createdAt, status, statuses };
    });
}

export default async function ConversaPage({ params }: PageProps) {
    await requireLogin();
    const { conversationId } = await params;

    const [conversations, rawMessages] = await Promise.all([
        getConversations(),
        getMessages(conversationId),
    ]);

    const selectedConversationId = Number(conversationId);
    const messages = normalizeMessages(rawMessages).reverse();

    const selectedConversation = conversations.find((c) => c?.id === selectedConversationId);

    const extractedCtx = pickBestWhatsAppContext(
        rawMessages
            .map((m) => extractWhatsAppConversationContext(m.payload))
            .filter((ctx): ctx is WhatsAppConversationContext => ctx !== null)
    );

    const toWaId = selectedConversation?.wa_id ?? extractedCtx?.contactWaId;
    const displayPhoneNumber =
        selectedConversation?.company_number ?? extractedCtx?.displayPhoneNumber;
    const phoneNumberId = extractedCtx?.phoneNumberId;
    const participant = selectedConversation?.participant;
    const participantIsJustNumber = isLikelyPhoneOrWaId(participant);
    const participantEqualsWa =
        participant && selectedConversation?.wa_id
            ? participant.trim() === selectedConversation.wa_id.trim()
            : false;

    const contactName =
        !participant || participant.trim().length === 0
            ? extractedCtx?.contactName
            : participantIsJustNumber || participantEqualsWa
                ? extractedCtx?.contactName ?? participant
                : participant;

    const conversationLabel = contactName ?? toWaId ?? `Conversa ${conversationId}`;

    return (
        <main className="flex h-screen flex-col">
            <div className="fixed top-0 left-0 right-0">
                <div className="flex items-center justify-between p-2 dark:text-white dark:bg-gray-900">
                    <Link
                        href="/conversas"
                        className="leading-none text-sm p-2 hover:dark:bg-gray-800 active:dark:bg-gray-700 rounded-full"
                    >
                        <ChevronLeftIcon className="inline-block h-4 w-4" />
                    </Link>
                    <h1 className="font-semibold px-2">
                        {conversationLabel}
                    </h1>
                </div>
            </div>
            <div className="grow flex flex-col">
                <ConversationThreadClient
                    initialMessages={messages}
                    toWaId={toWaId}
                    contactName={contactName}
                    displayPhoneNumber={displayPhoneNumber}
                    phoneNumberId={phoneNumberId}
                />
            </div>
        </main>
    );
}
