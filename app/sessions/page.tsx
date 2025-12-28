import Link from "next/link";
import { SessionsList } from "./SessionsList";

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

type Conversation = {
    id: number;
    participant?: string;
    wa_id?: string;
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

export default async function SessionsPage() {
    const conversations = await getConversations();

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
                    <SessionsList conversations={conversations} />
                </div>

                <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-300">
                    Selecione uma conversa para ver as mensagens.
                </div>
            </div>
        </main>
    );
}
