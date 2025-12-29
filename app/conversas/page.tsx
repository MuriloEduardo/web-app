import Link from "next/link";
import { ConversasList } from "./ConversasList";

export const dynamic = "force-dynamic";

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
};

type CommunicationsMessage = {
    payload?: unknown;
};

async function getConversations(): Promise<Conversation[]> {
    const res = await fetch(`${getBaseUrlFromEnv()}/api/sessions`, {
        cache: "no-store",
    });

    if (!res.ok) return [];

    const json = (await res.json()) as { data?: unknown };

    const items = Array.isArray(json.data) ? (json.data as unknown[]) : [];
    return items
        .map((c) => {
            if (!isRecord(c)) return null;
            if (typeof c.id !== "number") return null;

            const conversation: Conversation = {
                id: c.id,
                participant: typeof c.participant === "string" ? c.participant : undefined,
                wa_id: typeof c.wa_id === "string" ? c.wa_id : undefined,
            };

            return conversation;
        })
        .filter((v): v is Conversation => v !== null);
}

async function getMessagesForConversation(conversationId: number): Promise<CommunicationsMessage[]> {
    const res = await fetch(
        `${getBaseUrlFromEnv()}/api/sessions/${conversationId}?limit=20`,
        { cache: "no-store" }
    );

    if (!res.ok) return [];

    const json = (await res.json()) as { data?: unknown };
    return Array.isArray(json.data) ? (json.data as CommunicationsMessage[]) : [];
}

export default async function ConversasPage() {
    const conversations = await getConversations();

    const enriched = await Promise.all(
        conversations.map(async (c) => {
            const participant = c.participant;
            const participantIsNumber = isLikelyPhoneOrWaId(participant);
            const participantEqualsWa =
                participant && c.wa_id ? participant.trim() === c.wa_id.trim() : false;

            const needsName = !participant || participant.trim().length === 0 || participantIsNumber || participantEqualsWa;

            if (!needsName) return c;

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
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                    Conversas
                </h1>
                <Link
                    href="/"
                    className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                >
                    Home
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
                <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black">
                    <ConversasList conversations={enriched} />
                </div>

                <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-300">
                    Selecione uma conversa para ver as mensagens.
                </div>
            </div>
        </main>
    );
}
