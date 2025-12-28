import Link from "next/link";
import { SessionsList } from "../SessionsList";
import { SendMessage } from "@/app/components/SendMessage";

export const dynamic = "force-dynamic";

type Execution = {
    id?: number;
    created_at?: string;
    workflow_data?: {
        messages?: Array<{
            type?: string;
            data?: {
                id?: string;
                content?: string;
            };
        }>;
    };
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

async function getSessions(): Promise<number[]> {
    const res = await fetch(`${getBaseUrlFromEnv()}/api/sessions`, {
        cache: "no-store",
    });

    if (!res.ok) return [];

    const json = (await res.json()) as { data?: unknown };
    return Array.isArray(json.data)
        ? json.data.filter((v): v is number => typeof v === "number")
        : [];
}

async function getExecutions(sessionId: string): Promise<Execution[]> {
    const res = await fetch(`${getBaseUrlFromEnv()}/api/sessions/${sessionId}`, {
        cache: "no-store",
    });

    if (!res.ok) return [];

    const json = (await res.json()) as { data?: unknown };
    return Array.isArray(json.data) ? (json.data as Execution[]) : [];
}

function flattenMessages(executions: Execution[]) {
    const out: Array<{ id: string; text: string }> = [];

    for (const ex of executions) {
        const executionId = typeof ex.id === "number" ? String(ex.id) : "exec";
        const messages = ex.workflow_data?.messages;
        if (!Array.isArray(messages)) continue;

        for (const m of messages) {
            const type = m?.type ?? "message";
            const content = m?.data?.content;
            if (!content) continue;
            const msgId = m?.data?.id;

            out.push({
                id: msgId ? `${executionId}:${msgId}` : `${executionId}:${type}:${out.length}`,
                text: `[${type}] ${content}`,
            });
        }
    }

    return out;
}

export default async function SessionPage({ params }: PageProps) {
    const { sessionId } = await params;

    const [sessions, executions] = await Promise.all([
        getSessions(),
        getExecutions(sessionId),
    ]);

    const selectedSessionId = Number(sessionId);
    const messages = flattenMessages(executions);

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                    Sessão {sessionId}
                </h1>
                <div className="flex items-center gap-4">
                    <Link
                        href="/sessions"
                        className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                    >
                        Todas as sessões
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
                <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-black">
                    <SessionsList
                        sessions={sessions}
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
                                Nenhuma mensagem para esta sessão.
                            </div>
                        )}
                    </div>
                </div>

                <SendMessage />
            </div>
        </main>
    );
}
