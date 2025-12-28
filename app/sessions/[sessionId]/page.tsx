import Link from "next/link";
import { SessionsList } from "../SessionsList";
import { SendMessage } from "@/app/components/SendMessage";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
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

type PageProps = {
    params: Promise<{ sessionId: string }>;
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
    const res = await fetch(`${getBaseUrlFromEnv()}/api/sessions/${conversationId}`, {
        cache: "no-store",
    });

    if (!res.ok) return [];

    const json = (await res.json()) as { data?: unknown };
    return Array.isArray(json.data) ? (json.data as CommunicationsMessage[]) : [];
}

function extractWhatsAppText(payload: unknown): string | null {
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

function normalizeMessages(messages: CommunicationsMessage[]) {
    return messages.map((m, idx) => {
        const id =
            typeof m.id === "number"
                ? String(m.id)
                : `${m.conversation_id ?? "conv"}:${m.created_at ?? idx}`;

        const direction = typeof m.direction === "string" ? m.direction : "unknown";
        const text = extractWhatsAppText(m.payload) ?? "(mensagem sem texto)";

        return { id, text: `[${direction}] ${text}` };
    });
}

export default async function SessionPage({ params }: PageProps) {
    const { sessionId } = await params;

    const [conversations, rawMessages] = await Promise.all([
        getConversations(),
        getMessages(sessionId),
    ]);

    const selectedSessionId = Number(sessionId);
    const messages = normalizeMessages(rawMessages);

    const selectedConversation = conversations.find((c) => c?.id === selectedSessionId);

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10">
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                        Conversa {sessionId}
                    </h1>
                    {selectedConversation?.participant && (
                        <div className="text-sm text-zinc-600 dark:text-zinc-300">
                            Participante: {selectedConversation.participant}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <Link
                        href="/sessions"
                        className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                    >
                        Todas as conversas
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
                <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black">
                    <SessionsList
                        conversations={conversations.map((c) => ({
                            id: c.id,
                            participant: c.participant,
                            wa_id: c.wa_id,
                        }))}
                        selectedSessionId={Number.isFinite(selectedSessionId) ? selectedSessionId : undefined}
                    />
                </div>

                <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black">
                    <div className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        Mensagens
                    </div>

                    <div className="flex flex-col gap-2">
                        {messages.map((m) => (
                            <div
                                key={m.id}
                                className="rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
                            >
                                {m.text}
                            </div>
                        ))}

                        {messages.length === 0 && (
                            <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                Nenhuma mensagem para esta conversa.
                            </div>
                        )}
                    </div>
                </div>

                <SendMessage />
            </div>
        </main>
    );
}
