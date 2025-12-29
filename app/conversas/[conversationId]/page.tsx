import Link from "next/link";
import {
    ChevronLeftIcon,
} from "@heroicons/react/24/solid";
import { SendMessage } from "@/app/components/SendMessage";

export const dynamic = "force-dynamic";

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

async function getConversations(): Promise<Conversation[]> {
    const res = await fetch(`${getBaseUrlFromEnv()}/api/sessions`, {
        cache: "no-store",
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
    const res = await fetch(`${getBaseUrlFromEnv()}/api/sessions/${conversationId}?limit=200`, {
        cache: "no-store",
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

        return { id, direction, text };
    });
}

export default async function ConversaPage({ params }: PageProps) {
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
                <div className="flex items-center justify-between py-2 dark:text-white dark:bg-gray-900">
                    <Link
                        href="/conversas"
                        className="text-sm px-2"
                    >
                        <ChevronLeftIcon className="inline-block h-4 w-4" />
                    </Link>
                    <h1 className="font-semibold">
                        {conversationLabel}
                    </h1>
                </div>
            </div>
            <div className="grow flex flex-col">
                <div className="grow flex flex-col gap-2 overflow-y-auto px-4 pt-14 pb-24 dark:bg-gray-900">
                    {messages.map((m) => {
                        const isOutbound = m.direction === "outbound";

                        return (
                            <div
                                key={m.id}
                                className={
                                    isOutbound
                                        ? "flex w-full justify-end"
                                        : "flex w-full justify-start"
                                }
                            >
                                <div
                                    className={
                                        isOutbound
                                            ? "max-w-[78%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-zinc-200 px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                                            : "max-w-[78%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-zinc-50 px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
                                    }
                                >
                                    {m.text}
                                </div>
                            </div>
                        );
                    })}

                    {messages.length === 0 && (
                        <div className="text-sm text-zinc-500 dark:text-zinc-400">
                            Nenhuma mensagem para esta conversa.
                        </div>
                    )}
                </div>

                <div className="fixed bottom-0 left-0 right-0">
                    <SendMessage
                        toWaId={toWaId}
                        contactName={contactName}
                        displayPhoneNumber={displayPhoneNumber}
                        phoneNumberId={phoneNumberId}
                    />
                </div>
            </div>
        </main>
    );
}
